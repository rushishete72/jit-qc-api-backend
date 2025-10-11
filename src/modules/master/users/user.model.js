/**
 * @fileoverview Master User and Role Database Model.
 * @description यह मॉड्यूल PostgreSQL डेटाबेस के साथ सभी उपयोगकर्ता (User), भूमिका (Role) और
 * RBAC (Role-Based Access Control) अनुमति (Permission) मैपिंग को सीधे संभालता है।
 * यह pg-promise लाइब्रेरी और उसके helpers का उपयोग करके SQL क्वेरीज़ का निर्माण करता है।
 * @module modules/master/users/user.model
 */

const { db } = require('../../../../database/db'); 
const pgp = require('pg-promise')({ capSQL: true }); // pgp.helpers का उपयोग करने के लिए

// =========================================================================
// A. MASTER ROLES FUNCTIONS (Original 5 + 2 Missing Functions)
// =========================================================================

/** * 1. नया रोल बनाता है (e.g., ADMIN, INSPECTOR, SUPERVISOR) और बनाए गए रिकॉर्ड को वापस करता है।
 * @async
 * @function createRole
 * @param {object} data - रोल डेटा। इसमें कम से कम `role_name` होना चाहिए।
 * @returns {Promise<object>} - बनाया गया रोल ऑब्जेक्ट (`db.one` का उपयोग करता है)।
 */
const createRole = async (data) => {
    const columnSet = new pgp.helpers.ColumnSet([
        'role_name', 
    ], { table: 'roles' });
    
    const insertData = {
        role_name: data.role_name
    };

    const query = pgp.helpers.insert(insertData, columnSet) + ' RETURNING *';
    return db.one(query); 
};

/** * 2. ID द्वारा रोल को प्राप्त करता है।
 * @async
 * @function getRoleById
 * @param {number} roleId - वांछित भूमिका की ID।
 * @returns {Promise<object | null>} - रोल ऑब्जेक्ट, या यदि नहीं मिला तो `null`।
 */
const getRoleById = async (roleId) => {
    return db.oneOrNone("SELECT * FROM roles WHERE role_id = $1", [roleId]);
};

/** * 3. सभी रोल्स को प्राप्त करता है (Lookup List)।
 * @async
 * @function getAllRoles
 * @param {object} [options] - फ़िल्टरिंग विकल्प। वर्तमान में केवल `isActive` (unused) शामिल है।
 * @returns {Promise<Array<object>>} - रोल की सूची, नाम के अनुसार आरोही क्रम (ASC) में सॉर्ट की गई।
 * @detail यह फ़ंक्शन जानबूझकर एक साधारण SQL स्ट्रिंग का उपयोग करता है और कोई जटिल फ़िल्टरिंग (जैसे Pagination) लागू नहीं करता है क्योंकि यह शायद एक एडमिन लुकअप लिस्ट के लिए है।
 */
const getAllRoles = async ({ isActive = null }) => {
    // सबसे सरल संभव क्वेरी: एक लाइन की स्ट्रिंग।
    const query = "SELECT role_id, role_name, created_at, updated_at FROM roles ORDER BY role_name ASC";
    return db.any(query); 
};

/** * 4. ID द्वारा रोल डेटा को अपडेट करता है।
 * @async
 * @function updateRole
 * @param {number} roleId - अपडेट की जाने वाली भूमिका की ID।
 * @param {object} data - अद्यतन डेटा (जैसे `role_name`)। `updated_at` स्वचालित रूप से सेट हो जाता है।
 * @returns {Promise<object | null>} - अपडेटेड रोल ऑब्जेक्ट, या यदि कोई रोल नहीं मिला/अपडेट नहीं हुआ तो `null`।
 * @detail pgp.helpers.update का उपयोग करता है।
 */
const updateRole = async (roleId, data) => {
    const columnSet = new pgp.helpers.ColumnSet([
        'role_name', 
        { name: 'updated_at', def: 'now()' } 
    ], { table: 'roles' });

    data.role_id = roleId;
    
    const updateQuery = pgp.helpers.update(data, null, 'roles') 
                     + ' WHERE role_id = ${role_id} RETURNING *';
    
    return db.oneOrNone(updateQuery, data);
};

/** * 5. चेक करता है कि रोल किसी सक्रिय (is_active = TRUE) यूजर द्वारा उपयोग किया जा रहा है या नहीं।
 * @async
 * @function isRoleInUse
 * @param {number} roleId - जाँच की जाने वाली भूमिका की ID।
 * @returns {Promise<boolean>} - यदि कोई सक्रिय उपयोगकर्ता इस रोल को असाइन किया गया है तो `TRUE`।
 */
const isRoleInUse = async (roleId) => {
    const query = 'SELECT COUNT(*) FROM users WHERE role_id = $1 AND is_active = TRUE'; 
    // 'a => +a.count' का उपयोग करके परिणाम को सीधे संख्या में बदलें
    const result = await db.one(query, [roleId], a => +a.count); 
    return result > 0;
};

/** * 6. रोल को हटाता है। (Permanent Delete - इस पर `isRoleInUse` की जाँच Controller में होनी चाहिए)।
 * @async
 * @function deleteRole
 * @param {number} roleId - हटाई जाने वाली भूमिका की ID।
 * @returns {Promise<number>} - डिलीट किए गए रो की संख्या (0 या 1)।
 * @detail `db.result` का उपयोग करके डिलीट किए गए रो की संख्या वापस करता है।
 */
const deleteRole = async (roleId) => {
    return db.result('DELETE FROM roles WHERE role_id = $1', roleId, r => r.rowCount);
};

/** * 7. रोल नाम द्वारा रोल को प्राप्त करता है (केस-असंवेदनशील मिलान के लिए ILIKE का उपयोग करता है)।
 * @async
 * @function getRoleByName
 * @param {string} role_name - जाँच की जाने वाली भूमिका का नाम।
 * @returns {Promise<object | null>} - रोल ऑब्जेक्ट (केवल `role_id` के साथ), या यदि नहीं मिला तो `null`।
 */
const getRoleByName = async (role_name) => {
    return db.oneOrNone('SELECT role_id FROM roles WHERE role_name ILIKE $1', role_name);
};


// -------------------------------------------------------------------------
// 🛡️ NEW RBAC FUNCTIONS for Permissions Table
// -------------------------------------------------------------------------

/** * 1.1. सभी उपलब्ध अनुमतियाँ (Permissions) प्राप्त करता है।
 * @async
 * @function getAllPermissions
 * @returns {Promise<Array<object>>} - सभी अनुमतियाँ (`permission_id`, `permission_key`, `description`) की सूची।
 */
const getAllPermissions = async () => {
    const query = "SELECT permission_id, permission_key, description FROM permissions ORDER BY permission_key ASC";
    return db.any(query); 
};

/** * 1.2. किसी रोल को विशिष्ट अनुमतियाँ असाइन करता है (RBAC MAPPING)।
 * @async
 * @function setRolePermissions
 * @param {number} roleId - वह भूमिका ID जिसे अनुमतियाँ असाइन करनी हैं।
 * @param {Array<string>} permissionKeys - अनुमतियों की कुंजी स्ट्रिंग्स (e.g., ['user:read', 'role:update']) की एक सरणी।
 * @returns {Promise<object>} - सफलता संदेश।
 * @detail यह फ़ंक्शन तीन-चरणीय ट्रांजेक्शनल लॉजिक का उपयोग करता है: 1) रोल के लिए मौजूदा मैपिंग हटाना (DELETE)। 2) प्रदान की गई keys को IDs में मैप करना। 3) नई मैपिंग सम्मिलित करना (INSERT)।
 */
const setRolePermissions = async (roleId, permissionKeys) => {
    // 1. role_id के लिए सभी मौजूदा अनुमतियाँ हटाएँ
    await db.none('DELETE FROM role_permissions WHERE role_id = $1', roleId);
    
    if (!permissionKeys || permissionKeys.length === 0) {
        return { success: true, message: 'All permissions removed for the role.' };
    }

    // 2. permission_keys को permission_ids में बदलें (SQL IN क्लॉज़ का उपयोग करता है)
    const permissionMap = await db.map('SELECT permission_key, permission_id FROM permissions WHERE permission_key IN ($1:csv)', [permissionKeys], row => ({
        key: row.permission_key,
        id: row.permission_id
    }));
    
    if (permissionMap.length === 0) {
        // यदि प्रदान की गई कोई भी कुंजी (key) DB में मान्य नहीं है
        return { success: false, message: 'No valid permissions found to assign.' };
    }

    // 3. नई मैपिंग डालें
    const insertData = permissionMap.map(p => ({
        role_id: roleId,
        permission_id: p.id
    }));

    const columnSet = new pgp.helpers.ColumnSet(['role_id', 'permission_id'], { table: 'role_permissions' });
    const query = pgp.helpers.insert(insertData, columnSet);
    
    await db.none(query);
    return { success: true, message: 'Role permissions updated successfully.' };
};


// =========================================================================
// B. MASTER USER (EMPLOYEE/INSPECTOR) FUNCTIONS (Original 10)
// =========================================================================

/** * 8. नया यूजर बनाता है (पासवर्ड हैश होने की उम्मीद है)। (Create)
 * @async
 * @function createUser
 * @param {object} data - उपयोगकर्ता डेटा। इसमें `password_hash`, `email`, `full_name`, `role_id` शामिल होना चाहिए।
 * @returns {Promise<object>} - बनाया गया उपयोगकर्ता ऑब्जेक्ट (केवल सार्वजनिक फ़ील्ड)।
 * @detail is_active डिफ़ॉल्ट रूप से `true` और is_verified डिफ़ॉल्ट रूप से `false` पर सेट होता है।
 */
const createUser = async (data) => {
    const insertData = {
        employee_id: data.employee_id || null, 
        password_hash: data.password_hash,
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number || null, 
        role_id: data.role_id,
        is_active: data.is_active !== undefined ? data.is_active : true,
        is_verified: data.is_verified !== undefined ? data.is_verified : false,
    };
    
    const columnSet = new pgp.helpers.ColumnSet([
        'employee_id', 'password_hash', 'full_name', 'email', 'phone_number', 'role_id', 
        { name: 'is_active', cast: 'boolean' },
        { name: 'is_verified', cast: 'boolean' } 
    ], { table: 'users' });
    
    const query = pgp.helpers.insert(insertData, columnSet) + ' RETURNING user_id, employee_id, full_name, role_id, is_active, is_verified'; 
    return db.one(query); 
};

/** * 9. ID द्वारा यूजर को प्राप्त करता है (रोल नाम के साथ)। (Read Single)
 * @async
 * @function getUserById
 * @param {number} userId - वांछित उपयोगकर्ता की ID।
 * @returns {Promise<object | null>} - उपयोगकर्ता डेटा (रोल नाम सहित), या `null`।
 */
const getUserById = async (userId) => {
    const query = `
        SELECT mu.user_id, mu.employee_id, mu.full_name, mu.email, mu.phone_number, mu.is_active, mu.role_id, mu.is_verified, mr.role_name, mu.created_at
        FROM users mu 
        JOIN roles mr ON mu.role_id = mr.role_id 
        WHERE mu.user_id = $1
    `.replace(/\s+/g, ' ').trim(); 
    return db.oneOrNone(query, [userId]);
};

/** * 10. Username (email) द्वारा यूजर को प्राप्त करता है (लॉगिन/सुरक्षा के लिए)।
 * @async
 * @function getUserByUsernameWithHash
 * @param {string} email - उपयोगकर्ता का ईमेल।
 * @returns {Promise<object | null>} - महत्वपूर्ण लॉगिन डेटा (पासवर्ड हैश, रोल नाम, सक्रिय स्थिति) या `null`।
 * @detail यह फ़ंक्शन केवल सक्रिय (`is_active = TRUE`) उपयोगकर्ताओं को पुनर्प्राप्त करता है और पासवर्ड हैश को शामिल करता है।
 */
const getUserByUsernameWithHash = async (email) => { 
    const query = `
        SELECT mu.user_id, mu.employee_id, mu.password_hash, mu.full_name, mu.role_id, mu.is_active, mu.is_verified, mr.role_name
        FROM users mu 
        JOIN roles mr ON mu.role_id = mr.role_id 
        WHERE mu.email = $1 AND mu.is_active = TRUE 
    `.replace(/\s+/g, ' ').trim(); 
    return db.oneOrNone(query, [email]);
};

/** * 11. सभी यूजर्स को पेजिनेशन, फ़िल्टरिंग और रोल नाम के साथ रिट्रीव करता है। (Read All)
 * @async
 * @function getAllUsers
 * @param {object} options - फ़िल्टरिंग और पेजिनेशन विकल्प।
 * @param {number} [options.limit=10] - प्रति पृष्ठ आइटम की अधिकतम संख्या।
 * @param {number} [options.offset=0] - स्किप करने के लिए आइटम्स की संख्या।
 * @param {string} [options.search] - `full_name`, `employee_id`, या `email` द्वारा खोज कीवर्ड।
 * @param {number} [options.roleId] - भूमिका ID द्वारा फ़िल्टर करें।
 * @param {boolean} [options.isActive] - सक्रिय स्थिति द्वारा फ़िल्टर करें (`TRUE` या `FALSE`)।
 * @returns {Promise<{data: Array<object>, total_count: number}>} - उपयोगकर्ता सूची और कुल संख्या।
 * @detail SQL इंजेक्शन को रोकने के लिए pg-promise के `$placeholder` का उपयोग करके गतिशील `WHERE` क्लॉज़ बनाता है।
 */
const getAllUsers = async ({ limit = 10, offset = 0, search, roleId = null, isActive = null }) => {
    let whereClause = `WHERE 1=1`;
    let queryParams = [];
    let paramIndex = 1;

    if (isActive === true || isActive === false) { 
        whereClause += ` AND mu.is_active = $${paramIndex++}`;
        queryParams.push(isActive);
    }
    if (roleId) {
        whereClause += ` AND mu.role_id = $${paramIndex++}`;
        queryParams.push(roleId);
    }
    if (search) {
        // ILIKE और पैरामीटर का उपयोग करके सुरक्षित खोज
        whereClause += ` AND (mu.full_name ILIKE $${paramIndex} OR mu.employee_id ILIKE $${paramIndex} OR mu.email ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`); 
        paramIndex++;
    }
    
    // Total Count क्वेरी
    const totalCountParams = queryParams.slice(0); 
    const countQuery = `SELECT COUNT(mu.user_id) AS total_count FROM users mu ${whereClause}`.replace(/\s+/g, ' ').trim();
    const totalResult = await db.one(countQuery, totalCountParams);
    const total_count = parseInt(totalResult.total_count, 10);
    
    // LIMIT और OFFSET जोड़ें
    queryParams.push(limit, offset);

    // मुख्य डेटा क्वेरी
    let finalQuery = `
        SELECT mu.user_id, mu.employee_id, mu.full_name, mu.email, mu.phone_number, mu.is_active, mr.role_name
        FROM users mu 
        JOIN roles mr ON mu.role_id = mr.role_id 
        ${whereClause} 
        ORDER BY mu.full_name ASC 
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `.replace(/\s+/g, ' ').trim(); 
    
    const data = await db.any(finalQuery, queryParams);
    return { data, total_count };
};

/** * 12. यूजर डेटा को अपडेट करता है (पासवर्ड हैश शामिल नहीं)। (Update)
 * @async
 * @function updateUser
 * @param {number} userId - अपडेट किए जाने वाले उपयोगकर्ता की ID।
 * @param {object} data - अद्यतन डेटा। `is_verified` या `is_active` को बूलियन के रूप में अपडेट करने की अनुमति देता है।
 * @returns {Promise<object | null>} - अपडेटेड उपयोगकर्ता ऑब्जेक्ट, या `null`।
 */
const updateUser = async (userId, data) => {
    // 💡 UPGRADE: is_verified को अपडेट करने की अनुमति दें
    const columnSet = new pgp.helpers.ColumnSet([
        'employee_id', 'full_name', 'email', 'phone_number', 'role_id', 
        { name: 'is_active', cast: 'boolean' },
        { name: 'is_verified', cast: 'boolean' }, // 💡 NEW: Verification अपडेट के लिए
        { name: 'updated_at', def: 'now()' } 
    ], { table: 'users' });

    data.user_id = userId;
    
    const updateQuery = pgp.helpers.update(data, null, 'users') 
                     + ' WHERE user_id = ${user_id} RETURNING user_id, employee_id, full_name, role_id, is_active, is_verified, updated_at';
    
    return db.oneOrNone(updateQuery, data);
};

/** * 13. यूजर का पासवर्ड अपडेट करता है (हैश होने के बाद)। (Security Update)
 * @async
 * @function updatePassword
 * @param {number} userId - उपयोगकर्ता ID।
 * @param {string} newHashedPassword - नया हैश किया गया पासवर्ड।
 * @returns {Promise<object | null>} - अपडेटेड उपयोगकर्ता ID और अपडेटेड टाइमस्टैम्प।
 */
const updatePassword = async (userId, newHashedPassword) => {
    const query = `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE user_id = $1 RETURNING user_id, updated_at`.trim();
    return db.oneOrNone(query, [userId, newHashedPassword]);
};

/** * 14. यूजर को निष्क्रिय (Deactivate) करता है (`is_active = FALSE` सेट करता है)। (Soft Delete)
 * @async
 * @function deactivateUser
 * @param {number} userId - निष्क्रिय किए जाने वाले उपयोगकर्ता की ID।
 * @returns {Promise<object | null>} - निष्क्रिय किए गए उपयोगकर्ता ID और सक्रिय स्थिति। यदि पहले से ही निष्क्रिय है तो `null`।
 */
const deactivateUser = async (userId) => {
    const query = `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE user_id = $1 AND is_active = TRUE RETURNING user_id, is_active`.trim();
    return db.oneOrNone(query, [userId]);
};

/** * 15. यूजर को इंस्पेक्टर के रूप में चिह्नित करता है (यह फ़ंक्शन केवल अद्यतन समय (updated_at) को छूता है; लॉजिक अपूर्ण है)।
 * @async
 * @function markAsInspector
 * @param {number} userId - उपयोगकर्ता ID।
 * @param {Array<string>} inspectionAreas - निरीक्षण क्षेत्रों की सूची (वर्तमान में कोड में अप्रयुक्त)।
 * @returns {Promise<object | null>} - उपयोगकर्ता ID।
 */
const markAsInspector = async (userId, inspectionAreas) => {
    const query = `UPDATE users SET updated_at = NOW() WHERE user_id = $1 RETURNING user_id`.trim();
    return db.oneOrNone(query, [userId]);
};

/** * 16. QC लॉट को असाइनमेंट के लिए सभी सक्रिय इंस्पेक्टर्स को प्राप्त करता है।
 * @async
 * @function getActiveInspectors
 * @returns {Promise<Array<object>>} - सक्रिय इंस्पेक्टर्स की सूची (जिनकी भूमिका 'INSPECTOR_TEST' या 'QC_STAFF' है)।
 * @detail यह फ़ंक्शन सख्त रूप से पूर्वनिर्धारित रोल नामों (`ILIKE 'INSPECTOR_TEST' OR mr.role_name ILIKE 'QC_STAFF'`) पर निर्भर करता है।
 */
const getActiveInspectors = async () => {
    const query = `
        SELECT mu.user_id, mu.employee_id, mu.full_name, mu.email, mu.phone_number
        FROM users mu 
        JOIN roles mr ON mu.role_id = mr.role_id 
        WHERE (mr.role_name ILIKE 'INSPECTOR_TEST' OR mr.role_name ILIKE 'QC_STAFF') AND mu.is_active = TRUE 
        ORDER BY mu.full_name ASC
    `.replace(/\s+/g, ' ').trim(); 
    return db.any(query);
};

/** * 17. यूजर के पिछले 30 दिनों के QC असाइनमेंट का सारांश प्राप्त करता है।
 * @async
 * @function getUserQcAssignmentSummary
 * @param {number} userId - उपयोगकर्ता ID (जो इंस्पेक्टर है)।
 * @returns {Promise<object>} - एक सारांश ऑब्जेक्ट जिसमें `total_assignments`, `completed_assignments`, और `completion_rate_percent` शामिल हैं।
 * @detail 30-दिन की अवधि के लिए QC लॉट टेबल (`qc_inspection_lots`) से डेटा खींचता है।
 */
const getUserQcAssignmentSummary = async (userId) => {
    const query = `
        SELECT
            COUNT(ql.lot_id) AS total_assignments,
            SUM(CASE WHEN ql.inspection_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_assignments,
            COALESCE(
                (CAST(SUM(CASE WHEN ql.inspection_status = 'COMPLETED' THEN 1 ELSE 0 END) AS NUMERIC) * 100 / NULLIF(COUNT(ql.lot_id), 0)), 
                0
            ) AS completion_rate_percent
        FROM
            qc_inspection_lots ql
        WHERE
            ql.inspector_user_id = $1 AND ql.date_assigned >= NOW() - INTERVAL '30 days'
    `.replace(/\s+/g, ' ').trim(); 
    return db.one(query, [userId]);
};


/** * 18. 🛡️ NEW RBAC FUNCTION: ID द्वारा यूजर के लिए सभी अनुमतियाँ (permission_key) प्राप्त करें (Login/Auth के लिए)।
 * @async
 * @function getPermissionsByUserId
 * @param {number} userId - उपयोगकर्ता ID।
 * @returns {Promise<Array<string>>} - अनुमतियों की कुंजी स्ट्रिंग्स की एक सरणी।
 * @detail यह फ़ंक्शन users, role_permissions, और permissions तालिकाओं को जोड़कर उपयोगकर्ता की अनुमतियाँ प्राप्त करता है।
 */
const getPermissionsByUserId = async (userId) => {
    const query = `
        SELECT 
            mp.permission_key
        FROM users mu
        JOIN role_permissions mrp ON mu.role_id = mrp.role_id
        JOIN permissions mp ON mrp.permission_id = mp.permission_id
        WHERE mu.user_id = $1 AND mu.is_active = TRUE
    `.replace(/\s+/g, ' ').trim();
    
    return db.manyOrNone(query, [userId], row => row.permission_key);
};


// =========================================================================
// FINAL EXPORTS (All 17 Functions)
// =========================================================================

module.exports = {
    // Role Functions
    createRole, getRoleById, getAllRoles, updateRole, isRoleInUse, deleteRole, getRoleByName,
    // 🛡️ NEW PERMISSION FUNCTIONS (RBAC)
    getAllPermissions, setRolePermissions,
    // User Functions
    createUser, getUserById, getUserByUsernameWithHash, getAllUsers, updateUser, 
    updatePassword, deactivateUser, markAsInspector, getActiveInspectors, getUserQcAssignmentSummary,
    // 🛡️ NEW RBAC EXPORT
    getPermissionsByUserId,
};