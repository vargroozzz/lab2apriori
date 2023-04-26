import { EventEmitter } from 'events';

interface ItemsCount {
    [stringifiedItem: string]: number
}

export interface IAprioriEvents<T> {
    on(event: 'data', listener: (itemset: Itemset<T>) => void): this;
    on(event: string, listener: Function): this;
}

export interface IAprioriResults<T> {
    itemsets: Itemset<T>[],
    executionTime: number
}

export interface Itemset<T> {
    items: T[],
    support: number
}

export class Apriori<T> extends EventEmitter implements IAprioriEvents<T> {
    private _transactions: T[][];

    /**
     * Apriori is an algorithm for frequent item set mining and association rule
     * earning over transactional databases.
     * It proceeds by identifying the frequent individual items in the given set of transactions
     * and extending them to larger and larger item sets as long as those item sets appear
     * sufficiently often in the database.
     *
     */
    constructor( private _support: number /*, private _confidence: number*/ ) {
        super();
    }

    /**
     * Executes the Apriori Algorithm.
     * You can keep track of frequent itemsets as they are mined by listening to the 'data' event on the Apriori object.
     * All mined itemsets, as well as basic execution stats, are returned at the end of the execution through a callback function or a Promise.
     *
     */
    public exec( transactions: T[][], cb?: (result: IAprioriResults<T>) => any ): Promise<IAprioriResults<T>> {
        this._transactions = transactions;
        // Relative support.
        this._support = Math.ceil(this._support * transactions.length);

        return new Promise<IAprioriResults<T>>( (resolve, reject) => {
            let time = process.hrtime();

            // Generate frequent one-itemsets.
            let frequentItemsets: Itemset<T>[][] = [ this.getFrequentOneItemsets(this._transactions) ];

            let i: number = 0;
            // Generate frequent (i+1)-itemsets.
            while( frequentItemsets[i].length > 0 ) {
                frequentItemsets.push( this.getFrequentKItemsets(frequentItemsets[i]) );
                i++;
            }

            let elapsedTime = process.hrtime(time);

            // Formatting results.
            let result: IAprioriResults<T> = {
                itemsets: [].concat.apply([], frequentItemsets),
                executionTime: Math.round((elapsedTime[0]*1000)+(elapsedTime[1]/1000000))
            };

            if(cb) cb(result);
            resolve(result);
        });
    }

    /**
     * Returns frequent one-itemsets from a given set of transactions.
     */
    private getFrequentOneItemsets( transactions: T[][] ): Itemset<T>[] {
        // This generates one-itemset candidates.
        let count: ItemsCount = this._getDistinctItemsCount(transactions);

        return Object.keys(count)
            .reduce<Itemset<T>[]>( (ret: Itemset<T>[], stringifiedItem: string) => {
                // Returning pruned one-itemsets.
                if( count[stringifiedItem] >= this._support ) {
                    let frequentItemset: Itemset<T> = {
                        support: count[stringifiedItem],
                        items: [JSON.parse(stringifiedItem)]
                    };
                    ret.push(frequentItemset);
                    this.emit('data', frequentItemset)
                }
                return ret;
            }, []);
    }

    /**
     * Returns frequent (k = n+1)-itemsets from a given array of frequent n-itemsets.
     *
     */
    private getFrequentKItemsets( frequentNItemsets: Itemset<T>[] ): Itemset<T>[] {
        // Trivial precondition.
        if(!frequentNItemsets.length) return [];

        // Size of frequent itemsets we want to determine.
        let k: number = frequentNItemsets[0].items.length + 1;

        // Get unique items from these itemsets (Brute-force approach).
        let items: T[] = frequentNItemsets
            .reduce<T[]>( (items: T[], itemset: Itemset<T>) => items.concat(itemset.items), [])
            .filter( (item: T, index: number, that: T[]) => that.indexOf(item) === index );

        // Generating candidates and counting their occurence.
        return this._getCandidatesCount( this._generateKCandidates(items,k) )
            // Pruning candidates.
            .filter( (itemset: Itemset<T>) => {
                let isFrequent: boolean = itemset.support >= this._support;
                if(isFrequent) this.emit('data', itemset);
                return isFrequent;
            });
    }

    /**
     * Returns all combinations (itemset candidates) of size k from a given set of items.
     *
     */
    private _generateKCandidates( items: T[], k: number): Itemset<T>[] {
        // Trivial preconditions over k.
        if(k > items.length || k <= 0) return [];
        if(k == items.length) return [{items: items, support: 0}];
        if(k == 1) return items.map( (item: T) => {
            return { items: [item], support: 0 };
        });

        let ret: Itemset<T>[] = [];
        for( let i: number = 0; i < items.length - k + 1; i++) {
            let head: T[] = items.slice(i, i + 1);
            this._generateKCandidates(items.slice(i + 1), k - 1)
                .forEach( (tailcomb: Itemset<T>) => ret.push({
                    items: head.concat(tailcomb.items),
                    support: 0
                }));
        }

        return ret;
    }

    /**
     * Populates an Itemset array with their support in the given set of transactions.
     *
     */
    private _getCandidatesCount( candidates: Itemset<T>[] ): Itemset<T>[] {
        this._transactions.forEach( (transaction: T[]) => {
            candidates.forEach( (candidate: Itemset<T>) => {
                let includesCandidate: boolean = candidate.items.every( (item: T) => transaction.indexOf(item) !== -1 );
                if(includesCandidate) candidate.support += 1;
            })
        });
        return candidates;
    }

    /**
     * Returns the occurence of single items in a given set of transactions.
     *
     */
    private _getDistinctItemsCount( transactions: T[][] ): ItemsCount {
        return transactions.reduce<ItemsCount>( (count: ItemsCount, arr: T[]) => {
            return arr.reduce<ItemsCount>( (count: ItemsCount, item: T) => {
                count[JSON.stringify(item)] = (count[JSON.stringify(item)] || 0) + 1;
                return count;
            }, count);
        }, {});
    }
}