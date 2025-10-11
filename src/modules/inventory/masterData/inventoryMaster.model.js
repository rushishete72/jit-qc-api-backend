// modules/inventory/masterData/inventoryMaster.model.js (Inventory Master - 15 Functions)

const db = require('../../../database/db'); 
const pgp = require('pg-promise')({ capSQL: true });

// =========================================================================
// A. UOM (UNIT OF MEASURE) MANAGEMENT (5)
// =========================================================================

/** 1. एक नया UOM (Unit of Measure) बनाता है। */
const createUom = async (data) => {
    // Note: uom_code (e.g., PC, KG, M), uom_name अनिवार्य हैं।
    const columnSet = new pgp.helpers.ColumnSet(['uom_code', 'uom_name', 'is_active'], { table: 'master_uoms' });
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/** 2. ID द्वारा एक UOM प्राप्त करता है। */
const getUomById = async (uomId) => {
    return db.oneOrNone('SELECT * FROM master_uoms WHERE uom_id = $1', [uomId]);
};

/** 3. सभी सक्रिय UOMs को प्राप्त करता है। */
const getAllActiveUoms = async () => {
    return db.any('SELECT uom_id, uom_code, uom_name FROM master_uoms WHERE is_active = TRUE ORDER BY uom_code ASC');
};

/** 4. UOM डिटेल्स को अपडेट करता है। */
const updateUom = async (uomId, data) => {
    const columnSet = new pgp.helpers.ColumnSet(['uom_code', 'uom_name', 'is_active', { name: 'updated_at', init: 'now' }], { table: 'master_uoms' });
    data.uom_id = uomId;
    const query = pgp.helpers.update(data, columnSet) + ' WHERE uom_id = ${uom_id} RETURNING *';
    return db.oneOrNone(query, data);
};

/** 5. जांचें कि क्या UOM का उपयोग किसी पार्ट या इन्वेंट्री आइटम में किया जा रहा है। (Dependency Check) */
const isUomInUse = async (uomId) => {
    // master_parts, inventory_stock_on_hand जैसी टेबल्स में जाँच करें।
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM master_parts WHERE primary_uom_id = $1) AS part_count,
            (SELECT COUNT(*) FROM inventory_stock_on_hand WHERE uom_id = $1) AS stock_count
    `;
    const result = await db.one(query, [uomId]);
    return (parseInt(result.part_count, 10) + parseInt(result.stock_count, 10)) > 0;
};


// =========================================================================
// B. STOCK STATUS & TYPE MANAGEMENT (10)
// =========================================================================

/** 6. एक नया Stock Type (e.g., Raw Material, Finished Goods) बनाता है। */
const createStockType = async (data) => {
    const columnSet = new pgp.helpers.ColumnSet(['type_code', 'type_description'], { table: 'master_stock_types' });
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/** 7. ID द्वारा एक Stock Type प्राप्त करता है। */
const getStockTypeById = async (typeId) => {
    return db.oneOrNone('SELECT * FROM master_stock_types WHERE type_id = $1', [typeId]);
};

/** 8. सभी Stock Types को प्राप्त करता है। */
const getAllStockTypes = async () => {
    return db.any('SELECT * FROM master_stock_types ORDER BY type_code ASC');
};

/** 9. एक नया Stock Status (e.g., Quality Hold, Available, Blocked) बनाता है। */
const createStockStatus = async (data) => {
    // Note: status_code, status_description, is_consumable (e.g., Available = TRUE, Hold = FALSE)
    const columnSet = new pgp.helpers.ColumnSet(['status_code', 'status_description', 'is_consumable', 'is_active'], { table: 'master_stock_statuses' });
    const query = pgp.helpers.insert(data, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/** 10. ID द्वारा एक Stock Status प्राप्त करता है। */
const getStockStatusById = async (statusId) => {
    return db.oneOrNone('SELECT * FROM master_stock_statuses WHERE status_id = $1', [statusId]);
};

/** 11. सभी सक्रिय Stock Statuses को प्राप्त करता है। */
const getAllActiveStockStatuses = async () => {
    return db.any('SELECT status_id, status_code, status_description, is_consumable FROM master_stock_statuses WHERE is_active = TRUE ORDER BY status_code ASC');
};

/** 12. जांचें कि क्या कोई Stock Status "Consumable" है। (Movement Validation) */
const isStatusConsumable = async (statusId) => {
    const result = await db.oneOrNone('SELECT is_consumable FROM master_stock_statuses WHERE status_id = $1', [statusId]);
    return result ? result.is_consumable : false;
};

/** 13. एक विशिष्ट Stock Type से जुड़े Parts की संख्या प्राप्त करता है। */
const getPartCountByStockType = async (typeId) => {
    const query = `
        SELECT 
            COUNT(*) AS part_count
        FROM 
            master_parts
        WHERE 
            stock_type_id = $1
    `;
    const result = await db.one(query, [typeId], a => +a.part_count);
    return result;
};

/** 14. Stock Status को अपडेट करता है। */
const updateStockStatus = async (statusId, data) => {
    const columnSet = new pgp.helpers.ColumnSet(['status_code', 'status_description', 'is_consumable', 'is_active', { name: 'updated_at', init: 'now' }], { table: 'master_stock_statuses' });
    data.status_id = statusId;
    const query = pgp.helpers.update(data, columnSet) + ' WHERE status_id = ${status_id} RETURNING *';
    return db.oneOrNone(query, data);
};

/** 15. स्टॉक ट्रांजैक्शन टेबल्स में सबसे अधिक इस्तेमाल किए जाने वाले UOM को प्राप्त करता है। (Reporting) */
const getMostUsedUomInStock = async () => {
    // Note: यह 'inventory_stock_on_hand' टेबल पर निर्भर करता है, जिसे हम बाद में बनाएंगे।
    const query = `
        SELECT
            mu.uom_code, mu.uom_name, COUNT(soh.uom_id) AS usage_count
        FROM
            inventory_stock_on_hand soh
        JOIN
            master_uoms mu ON soh.uom_id = mu.uom_id
        GROUP BY
            mu.uom_code, mu.uom_name
        ORDER BY
            usage_count DESC
        LIMIT 1
    `;
    return db.oneOrNone(query);
};

// =========================================================================
// FINAL EXPORTS (All 15 Functions)
// =========================================================================

module.exports = {
    // UOM (1-5)
    createUom,
    getUomById,
    getAllActiveUoms,
    updateUom,
    isUomInUse,

    // Stock Status & Type (6-15)
    createStockType,
    getStockTypeById,
    getAllStockTypes,
    createStockStatus,
    getStockStatusById,
    getAllActiveStockStatuses,
    isStatusConsumable,
    getPartCountByStockType,
    updateStockStatus,
    getMostUsedUomInStock,
};