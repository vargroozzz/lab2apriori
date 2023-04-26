import * as console from "node:console";
import {Apriori, IAprioriResults, Itemset} from "./Apriori.js";


const transactions: number[][] = [
        [ 0, 1, 3, 4, 7 ],
        [ 0, 1, 2 ],
        [ 0, 3, 4, 5, 6 ],
        [
            0, 1, 2, 3,
            4, 5, 7
        ],
        [ 1, 2, 3, 4, 5 ],
        [ 1, 3, 4 ],
        [ 3, 7, 9 ],
        [ 0, 1, 2, 3, 7 ],
        [ 1, 2, 3, 6, 7 ],
        [ 0, 7, 8 ]
    ];

// Execute Apriori with a minimum support of 3. Algorithm is generic.
const apriori: Apriori<number> = new Apriori<number>(0.3);

apriori.exec(transactions)
    .then( (result: IAprioriResults<number>) => {
        // Returns both the collection of frequent itemsets.
        const frequentItemsets: Itemset<number>[] = result.itemsets;

        console.log(frequentItemsets);
    });