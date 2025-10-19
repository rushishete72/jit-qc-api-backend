// src/modules/master/masterData.permission.js

const MASTER_DATA_MANAGE = 'MASTER_DATA_MANAGE';
const MASTER_DATA_READ_ALL = 'MASTER_DATA_READ_ALL'; // For reading sensitive/inactive master lists

// You can aggregate all permissions here or in a main file.
// For now, let's keep it separate for the module.

module.exports = {
    MASTER_DATA_MANAGE,
    MASTER_DATA_READ_ALL,
};