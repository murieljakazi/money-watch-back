const express = require('express');
const cors = require('cors');
const mysql = require('./db');
const { SERVER_PORT } = require('./env');
 
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CREATE NEW USER (TEMP)

app.post('/users', async (req, res) => {
    try {
        const values = req.body;
        const check = await mysql.query(`SELECT * FROM user WHERE username = ?`, values.username);
        if (check[0].length >= 1) {
            res.status(400).send('User alredy exists')
        } else {
            const post = await mysql.query(`INSERT INTO user SET ?`, values);
            const result = await mysql.query(`SELECT * FROM user WHERE id = ?`, post[0].insertId);
            console.log(result[0][0]);
            res.status(200).send(result[0][0]);
        }
    } catch (e) {
        console.error(e.message);
        res.status(500).send('Internal server error');
    }
})

// CREATE NEW ACCOUNT FOR USER

app.post('/users/:id/accounts', async (req, res) => {
    try {
        const userId = req.params.id;
        const values = req.body;
        const check = await mysql.query(`SELECT * FROM account WHERE name = ?`, values.name);
        if (check[0].length >= 1) {
            res.status(400).send('Account alredy exists')
        } else {
            values.user_id = userId
            const post = await mysql.query(`INSERT INTO account SET ?`, [values]);
            const result = await mysql.query(`SELECT * FROM account WHERE id = ?`, post[0].insertId);
            console.log(result[0][0]);
            res.status(200).send(result[0][0]);
        }
    } catch (e) {
        console.error(e.message);
        res.status(500).send('Internal server error');
    }
})

// CREATE A NEW TRANSACTION

app.post('/users/:userId/accounts/:accountId/transactions', async (req, res) => {
    try {
        const accountId = req.params.accountId;
        const values = req.body;
        values.account_id = accountId;
        console.log(values);
        const type = values.type;
        const post = await mysql.query(`INSERT INTO transaction SET ?`, [values]);
        const result = await mysql.query(`SELECT * FROM transaction WHERE id = ?`, post[0].insertId);
        switch (type) {
            case "POS (Point of sale)":
                adjustForPos(accountId, values);
                break;
            case "Deposit":
                adjustForDeposit(accountId, values);
                break;
            case "Cash Withdrawal":
                adjustForWithdrawal(accountId, values);
                break;
            case "Transfer (in)":
                adjustForInboundTransfer(accountId, values);
                break;
            case "Transfer (out)":
                adjustForOutboundTransfer(accountId, values);
                break;
        }
        res.status(200).send(result[0][0]);
    } catch (e) {
        console.error(e.message);
        res.status(500).send('Internal server error');
    }
});

// METHODS TO ADJUST BALANCE, SPENDING & DEPOSITS

const  adjustForPos = async (accountId, values) => {
    const oldValues = await mysql.query(`SELECT balance, spending FROM account WHERE id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    console.log("This is the old balance " + oldBalance);
    const oldSpending = parseInt(oldValues[0][0].spending);
    console.log("This is the new transaction amount " + values.amount);
    const newBalance = oldBalance - values.amount;
    const newSpending = oldSpending + values.amount;
    newValues.balance = newBalance;
    newValues.spending = newSpending;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0])
}

const adjustForDeposit = async (accountId, values) => {
    const oldValues = await mysql.query(`SELECT balance, deposits FROM account WHERE id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldDeposits = parseInt(oldValues[0][0].deposits);
    const newBalance = oldBalance + values.amount;
    const newDeposits = oldDeposits + values.amount;
    newValues.balance = newBalance;
    newValues.deposits = newDeposits;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0]);
};

const adjustForWithdrawal = async (accountId, values) => {
    const oldValues = await mysql.query(`SELECT balance, spending FROM account WHERE id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldSpending = parseInt(oldValues[0][0].spending);
    const newBalance = oldBalance - values.amount;
    const newSpending = oldSpending + values.amount;
    newValues.balance = newBalance;
    newValues.spending = newSpending;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0]);
};

const adjustForInboundTransfer =  async (accountId, values) => {
    const oldValues = await mysql.query(`SELECT balance, deposits from account where id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldDeposits = parseInt(oldValues[0][0].deposits);
    const newBalance = oldBalance + values.amount;
    const newDeposits = oldDeposits + values.amount;
    newValues.balance = newBalance;
    newValues.deposits = newDeposits;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0]);

};

const adjustForOutboundTransfer = async (accountId, values) => {
    const oldValues = await mysql.query(`SELECT balance, spending FROM account where id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldSpending = parseInt(oldValues[0][0].spending);
    const newBalance = oldBalance - values.amount;
    const newSpending = oldSpending + values.amount;
    console.log("spending value", newSpending);
    newValues.balance = newBalance;
    newValues.spending = newSpending;
    console.log("the new values", newValues);
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0]);
};

// METHOD TO RETRIEVE ALL TRANSACTIONS

const getAllTransactions = async (accountId) => {
    const result = await mysql.query(`SELECT * FROM transaction WHERE account_id = ? ORDER BY date DESC`, accountId);
    return result[0];
};

// METHOD TO RETRIEVE ONE TRANSACTION'S INFO

const getTransaction = async (transactionId) => {
    const result = await mysql.query(`SELECT * FROM transaction WHERE id = ?`, transactionId);
    // console.log("model", result[0][0].amount);
    return result[0][0];
}


// METHOD TO RETRIEVE Account INFO

const getAccountInfo = async (accountId) => {
    const result = await mysql.query(`SELECT * FROM account WHERE id = ?`, accountId);
    const transactionCount = await mysql.query(`SELECT COUNT(*) FROM transaction WHERE account_id = ?`, accountId);
    console.log("COUNT", transactionCount[0][0]['COUNT(*)']);
    const accountDetails = result[0][0];
    accountDetails.transactionCount = transactionCount[0][0]['COUNT(*)'];
    return accountDetails;
}

// METHOD TO EDIT A TRANSACTION 

const editTransaction = async (transactionId, updateValues) => {
    const result = await mysql.query(`UPDATE transaction SET ? WHERE id = ?`, [updateValues, transactionId]);
    console.log(result[0]);
    return result[0];
}

// METHOD TO DELETE A TRANSACTION

const deleteTransaction = async (transactionId) => {
    const result = await mysql.query(`DELETE FROM transaction WHERE id = ?`, transactionId);
    return result[0];
}

// VIEW ALL TRANSACTIONS

app.get('/users/:userId/accounts/:accountId/transactions', async (req, res) => {
    try {
        const accountId = req.params.accountId;
        const result = await getAllTransactions(accountId);
        res.status(200).json(result);
    } catch (e) {
        console.error(e.maessage);
        res.status(500).send('Internal server error');
    }
});

// VIEW ONE TRANSACTION

app.get('/users/:userId/accounts/:accountId/transactions/:transactionId', async (req, res) => {
    try {
        const transactionId = req.params.transactionId;
        const result = await getTransaction(transactionId);
        console.log("controller", result);

        res.status(200).json(result);
    } catch (e) {
        console.error(e.message);
        res.status(500).send('Internal server error');
    }
})

// VIEW ACCOUNT INFO

app.get('/users/:userId/accounts/:accountId', async (req, res) => {
    try {
        const accountId = req.params.accountId;
        const result = await getAccountInfo(accountId);
        console.log(result);
        res.status(200).json(result);
    } catch (e) {
        console.error(e.message);
        res.status(500).send('Internal server error');
    }
});

// ADUST FOR LARGER OUTGOING TRANSACTIONS

const adjustLargerOutbountTransaction = async(accountId, diff) => {
    console.log("ODIFF", diff);
    const oldValues = await mysql.query(`SELECT balance, spending FROM account where id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldSpending = parseInt(oldValues[0][0].spending);
    console.log("OPREV BAL", oldBalance);
    const newBalance = oldBalance - diff;
    const newSpending = oldSpending + diff;
    console.log("ONEW BAL", newBalance);
    newValues.balance = newBalance;
    newValues.spending = newSpending;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0]);
}

const adjustSmallerOutbountTransaction = async (accountId, diff) => {
    const oldValues = await mysql.query(`SELECT balance, spending FROM account where id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldSpending = parseInt(oldValues[0][0].spending);
    const newBalance = oldBalance + diff;
    const newSpending = oldSpending - diff;
    newValues.balance = newBalance;
    newValues.spending = newSpending;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0]);
}

const adjustLargerInboundTransaction = async (accountId, diff) => {
    const oldValues = await mysql.query(`SELECT balance, deposits FROM account where id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldDeposits = parseInt(oldValues[0][0].deposits);
    const newBalance = oldBalance + diff;
    const newDeposits = oldDeposits + diff;
    newValues.balance = newBalance;
    newValues.deposits = newDeposits;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0]);
};

const adjustSmallerInboundTransaction = async (accountId, diff) => {
    const oldValues = await mysql.query(`SELECT balance, deposits FROM account where id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldDeposits = parseInt(oldValues[0][0].deposits);
    const newBalance = oldBalance - diff;
    const newDeposits = oldDeposits - diff;
    newValues.balance = newBalance;
    newValues.deposits = newDeposits;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
    console.log(result[0]);
}

// EDIT TRANSACTION

app.put('/users/:userId/accounts/:accountId/transactions/:transactionId', async (req, res) => {
    try {
        const accountId = req.params.accountId;
        const transactionId = req.params.transactionId;
        const updateValues = req.body;
        const newAmount = updateValues.amount;
        const oldTransaction = await getTransaction(transactionId)
        const { type: oldType, amount: oldAmount } = oldTransaction
        const result = await editTransaction(transactionId, updateValues);
        if (oldType == "POS (Point of sale)" || oldType == "Cash Withdrawal" || oldType == "Transfer (out)") {
            if (newAmount > oldAmount) {
                const diff = newAmount - oldAmount;
                adjustLargerOutbountTransaction(accountId, diff)
            } else if (newAmount < oldAmount) {
                const diff = oldAmount - newAmount;
                adjustSmallerOutbountTransaction(accountId, diff)
            }
        } else if (oldType == "Deposit" || oldType == "Transfer (in)") {
            if (newAmount > oldAmount) {
                const diff = newAmount - oldAmount;
                adjustLargerInboundTransaction(accountId, diff)
            } else if (newAmount < oldAmount) {
                const diff = oldAmount - newAmount;
                adjustSmallerInboundTransaction(accountId, diff)
            }
        }
        res.status(200).json(result);
    } catch (e) {
        console.error(e.message);
        res.status(500).send('Internal server error');
    }
});

// DELETE TRANSACTION

const adjustmentForDeletedSpending = async (accountId, amount) => {
    const oldValues = await mysql.query(`SELECT balance, spending FROM account WHERE id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldSpending = parseInt(oldValues[0][0].spending);
    const newBalance = oldBalance + amount;
    const newSpending = oldSpending - amount;
    newValues.balance = newBalance;
    newValues.spending = newSpending;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
};

const adjustmentForDeletedIncome = async (accountId, amount) => {
    const oldValues = await mysql.query(`SELECT balance, deposits FROM account WHERE id = ?`, accountId);
    const newValues = {};
    const oldBalance = parseInt(oldValues[0][0].balance);
    const oldDeposits = parseInt(oldValues[0][0].deposits);
    const newBalance = oldBalance - amount;
    const newDeposits = oldDeposits - amount;
    newValues.balance = newBalance;
    newValues.deposits = newDeposits;
    const result = await mysql.query(`UPDATE account SET ? where id = ?`, [newValues, accountId]);
};

app.delete('/users/:userId/accounts/:accountId/transactions/:transactionId', async (req, res) => {
    try {
        const accountId = req.params.accountId;
        const transactionId = req.params.transactionId;
        const transaction = await getTransaction(transactionId);
        const amount = parseInt(transaction.amount);
        const type = transaction.type;
        const result = await deleteTransaction(transactionId);
        if (type == "POS (Point of sale)" || type == "Cash Withdrawal" || type == "Transfer (out)") {
            adjustmentForDeletedSpending(accountId, amount);
        } else if (type == "Deposit" || type == "Transfer (in)") {
            adjustmentForDeletedIncome(accountId, amount);
        }
        res.status(204).send();
    } catch (e) {
        console.error(e.message)
        res.status(500).send('Internal server error');
    }
});


const server = app.listen(SERVER_PORT, () => {
    console.log(`Server is listening on : ${SERVER_PORT}`);
});

module.exports = server;