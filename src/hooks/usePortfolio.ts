import { useState, useEffect, useCallback } from 'react';
import { db } from '@/core/firebase';
import { collection, doc, getDoc, getDocs, updateDoc, setDoc, query, orderBy, limit, writeBatch } from 'firebase/firestore';
import { Holding, Transaction, UserProfile, WatchlistItem } from '@/types';
import { handleFirestoreError, OperationType } from '@/utils/firestoreErrorHandler';

export const usePortfolio = (userId?: string) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPortfolio = useCallback(async () => {
        if (!userId) return;

        if (userId === 'dev-guest-user') {
            // Initialize mock guest profile and empty holdings
            setProfile({
                uid: 'dev-guest-user',
                email: 'guest@example.com',
                displayName: 'Guest Trader',
                numAssetsToWatch: 5,
                alertThreshold: 5.0,
                balance: 100000.0,
                role: 'user'
            });
            setHoldings([]);
            setTransactions([]);
            return;
        }

        setIsLoading(true);

        try {
            // 1. Fetch Profile
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                setProfile({ uid: userId, ...userSnap.data() } as UserProfile);
            }

            // 2. Fetch Holdings
            const holdingsRef = collection(db, 'users', userId, 'holdings');
            const holdingsSnap = await getDocs(holdingsRef);
            const loadedHoldings: Holding[] = [];
            holdingsSnap.forEach(doc => {
                loadedHoldings.push(doc.data() as Holding);
            });
            setHoldings(loadedHoldings);

            // 3. Fetch Recent Transactions
            const txRef = collection(db, 'users', userId, 'transactions');
            const q = query(txRef, orderBy('timestamp', 'desc'), limit(10));
            const txSnap = await getDocs(q);
            const loadedTx: Transaction[] = [];
            txSnap.forEach(doc => {
                loadedTx.push(doc.data() as Transaction);
            });
            setTransactions(loadedTx);
        } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${userId}/portfolio`);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchPortfolio();
    }, [fetchPortfolio]);

    const executeTrade = async (asset: WatchlistItem, amount: number, type: 'BUY' | 'SELL') => {
        if (!profile || !userId) return;

        const latestData = asset.dailyData[asset.dailyData.length - 1];
        const price = latestData.closingPrice;
        const totalCost = price * amount;

        if (type === 'BUY' && profile.balance < totalCost) {
            throw new Error('Insufficient balance');
        }

        const currentHolding = holdings.find(h => h.assetId === asset.id);
        if (type === 'SELL' && (!currentHolding || currentHolding.amount < amount)) {
            throw new Error('Insufficient asset amount');
        }

        setIsLoading(true);
        try {
            const batch = writeBatch(db);

            // 1. Update Profile Balance
            const userRef = doc(db, 'users', userId);
            const newBalance = type === 'BUY' ? profile.balance - totalCost : profile.balance + totalCost;

            // Only update if not guest, or just update local state if guest (to keep it interactive)
            if (userId !== 'dev-guest-user') {
                batch.update(userRef, { balance: newBalance });
            }

            // 2. Update Holdings
            const holdingRef = doc(db, 'users', userId, 'holdings', asset.id);
            let newHolding: Holding;

            if (currentHolding) {
                if (type === 'BUY') {
                    const newAmount = currentHolding.amount + amount;
                    const newTotalCostBasis = currentHolding.totalCostBasis + totalCost;
                    newHolding = {
                        ...currentHolding,
                        amount: newAmount,
                        totalCostBasis: newTotalCostBasis,
                        averageCost: newTotalCostBasis / newAmount
                    };
                } else {
                    const newAmount = currentHolding.amount - amount;
                    // For selling, we usually reduce cost basis proportionally to amount sold
                    const reductionRatio = amount / currentHolding.amount;
                    const newTotalCostBasis = currentHolding.totalCostBasis * (1 - reductionRatio);
                    newHolding = {
                        ...currentHolding,
                        amount: newAmount,
                        totalCostBasis: newTotalCostBasis,
                        // averageCost stays the same
                    };
                }
            } else {
                // New BUY
                newHolding = {
                    assetId: asset.id,
                    symbol: asset.symbol,
                    name: asset.name,
                    amount: amount,
                    averageCost: price,
                    totalCostBasis: totalCost
                };
            }

            if (userId !== 'dev-guest-user') {
                if (newHolding.amount <= 0) {
                    batch.delete(holdingRef);
                } else {
                    batch.set(holdingRef, newHolding);
                }
            }

            // 3. Record Transaction
            const txId = `tx-${Date.now()}`;
            const transaction: Transaction = {
                id: txId,
                assetId: asset.id,
                symbol: asset.symbol,
                type,
                amount,
                price,
                total: totalCost,
                timestamp: new Date().toISOString()
            };

            if (userId !== 'dev-guest-user') {
                const newTxRef = doc(db, 'users', userId, 'transactions', txId);
                batch.set(newTxRef, transaction);
                await batch.commit();
            }

            // Update Local State for immediate feedback
            setProfile(prev => prev ? { ...prev, balance: newBalance } : null);
            setHoldings(prev => {
                if (newHolding.amount <= 0) return prev.filter(h => h.assetId !== asset.id);
                const exists = prev.some(h => h.assetId === asset.id);
                if (exists) return prev.map(h => h.assetId === asset.id ? newHolding : h);
                return [...prev, newHolding];
            });
            setTransactions(prev => [transaction, ...prev.slice(0, 9)]);

        } catch (err) {
            console.error('Trade execution failed:', err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { profile, holdings, transactions, isLoading, executeTrade, refresh: fetchPortfolio };
};
