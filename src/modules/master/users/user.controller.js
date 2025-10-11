/**
 * @fileoverview Master User and Role Management Controller.
 * @description यह मॉड्यूल Master/Admin Panel के लिए उपयोगकर्ता (User) और भूमिका (Role) से संबंधित सभी
 * CRUD (Create, Read, Update, Delete) और RBAC (Role-Based Access Control) सेटिंग्स को संभालता है।
 * यह HTTP अनुरोधों को संसाधित (process) करता है, इनपुट डेटा को मान्य करता है, और व्यावसायिक तर्क (business logic) के लिए मॉडल परत (Model Layer) के साथ इंटरैक्ट करता है।
 * @module modules/master/users/user.controller
 */

const userModel = require('./user.model');
const bcrypt = require('bcryptjs');

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

/**
 * पासवर्ड को Salt Rounds 10 का उपयोग करके हैश करता है।
 * @async
 * @param {string} password - सादा पाठ (plain text) पासवर्ड।
 * @returns {Promise<string>} - हैश किया गया पासवर्ड स्ट्रिंग।
 */
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// ----------------------------------------------------------------------
// MASTER ROLE FUNCTIONS
// ----------------------------------------------------------------------

/** * 1. नया रोल बनाता है।
 * @async
 * @function createRole
 * @param {object} req - Express Request Object. req.body में `role_name` होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 201 (Created) or 400/409/500.
 * * @throws {400} यदि `role_name` अनुपस्थित है।
 * @throws {409} यदि भूमिका नाम पहले से मौजूद है (`userModel.getRoleByName` द्वारा जाँचा गया)।
 */
const createRole = async (req, res) => {
    try {
        const { role_name } = req.body;
        if (!role_name) {
            return res.status(400).json({ success: false, message: 'Role name is required.' });
        }
        
        // यह माना जाता है कि मॉडल में getRoleByName मौजूद है
        const existingRole = await userModel.getRoleByName(role_name); 
        if (existingRole) {
            return res.status(409).json({ success: false, message: `Role name '${role_name}' already exists.` });
        }

        const newRole = await userModel.createRole(req.body);
        res.status(201).json({ success: true, message: 'Role created successfully.', data: newRole });
    } catch (error) {
        console.error("Error in createRole:", error);
        res.status(500).json({ success: false, message: 'Failed to create role.' });
    }
};

/** * 2. सभी रोल्स को प्राप्त करता है। (Pagination और Filtering के लिए Query Parameters स्वीकार करता है)।
 * @async
 * @function getAllRoles
 * @param {object} req - Express Request Object. req.query में फ़िल्टरिंग विकल्प हो सकते हैं।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK).
 */
const getAllRoles = async (req, res) => {
    try {
        const roles = await userModel.getAllRoles(req.query);
        res.status(200).json({ success: true, message: 'Roles fetched successfully.', data: roles });
    } catch (error) {
        console.error("Error in getAllRoles:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch roles.' });
    }
};

/** * 3. ID द्वारा रोल को प्राप्त करता है।
 * @async
 * @function getRoleById
 * @param {object} req - Express Request Object. req.params में `roleId` होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) or 404/500.
 * * @throws {404} यदि ID से कोई रोल नहीं मिला।
 */
const getRoleById = async (req, res) => {
    try {
        const { roleId } = req.params;
        const role = await userModel.getRoleById(roleId);
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }
        res.status(200).json({ success: true, message: 'Role fetched successfully.', data: role });
    } catch (error) {
        console.error("Error in getRoleById:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch role.' });
    }
};

/** * 4. ID द्वारा रोल को अपडेट करता है।
 * @async
 * @function updateRole
 * @param {object} req - Express Request Object. req.params में `roleId` और req.body में अपडेटेड डेटा होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) or 404/500.
 * * @throws {404} यदि रोल नहीं मिला या कोई परिवर्तन नहीं किया गया।
 */
const updateRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const updatedRole = await userModel.updateRole(roleId, req.body);
        if (!updatedRole) {
            return res.status(404).json({ success: false, message: 'Role not found or nothing to update.' });
        }
        res.status(200).json({ success: true, message: 'Role updated successfully.', data: updatedRole });
    } catch (error) {
        console.error("Error in updateRole:", error);
        res.status(500).json({ success: false, message: 'Failed to update role.' });
    }
};

/** * 5. ID द्वारा रोल को हटाता है। (सॉफ्ट डिलीट या सक्रिय उपयोग की जाँच करता है)।
 * @async
 * @function deleteRole
 * @param {object} req - Express Request Object. req.params में `roleId` होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) or 404/409/500.
 * * @throws {409} यदि रोल वर्तमान में सक्रिय उपयोगकर्ताओं को सौंपा गया है (`userModel.isRoleInUse` द्वारा जाँचा गया)।
 * @throws {404} यदि रोल नहीं मिला।
 */
const deleteRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const isInUse = await userModel.isRoleInUse(roleId);
        if (isInUse) {
            return res.status(409).json({ success: false, message: 'Cannot delete role: Role is currently assigned to active users.' });
        }
        
        // यह माना जाता है कि मॉडल में deleteRole फ़ंक्शन मौजूद है
        const deletedRole = await userModel.deleteRole(roleId); 
        if (!deletedRole) {
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }
        res.status(200).json({ success: true, message: 'Role deleted successfully.' });
    } catch (error) {
        console.error("Error in deleteRole:", error);
        res.status(500).json({ success: false, message: 'Failed to delete role.' });
    }
};

// ----------------------------------------------------------------------
// 🛡️ NEW RBAC PERMISSION FUNCTIONS
// ----------------------------------------------------------------------

/** * 6.1. 🛡️ NEW: सभी उपलब्ध अनुमतियाँ (Permissions) प्राप्त करें।
 * @async
 * @function getAllPermissions
 * @param {object} req - Express Request Object.
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK).
 */
const getAllPermissions = async (req, res) => {
    try {
        const permissions = await userModel.getAllPermissions();
        res.status(200).json({ success: true, message: 'Permissions fetched successfully.', data: permissions });
    } catch (error) {
        console.error("Error in getAllPermissions:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch permissions.' });
    }
};

/** * 6.2. 🛡️ NEW: किसी विशिष्ट रोल (Role) के लिए अनुमतियाँ (Permissions) सेट करें (Role-Permission Mapping)।
 * @async
 * @function setRolePermissions
 * @param {object} req - Express Request Object. req.params में `roleId` और req.body में `permission_keys` (string array) होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) or 400/500.
 * * @throws {400} यदि `permission_keys` एक सरणी (array) नहीं है।
 * @throws {400} यदि मॉडल परत (Model layer) किसी अमान्य रोल या अनुमति कुंजी (permission key) को इंगित करती है।
 */
const setRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permission_keys } = req.body; // अपेक्षा है कि यह एक key array होगा
        
        if (!Array.isArray(permission_keys)) {
            return res.status(400).json({ success: false, message: 'permission_keys must be an array.' });
        }
        
        const result = await userModel.setRolePermissions(roleId, permission_keys);
        
        if (!result.success) {
             return res.status(400).json({ success: false, message: result.message });
        }

        res.status(200).json({ success: true, message: 'Role permissions updated successfully.' });
    } catch (error) {
        console.error("Error in setRolePermissions:", error);
        res.status(500).json({ success: false, message: 'Failed to update role permissions.' });
    }
};

// ----------------------------------------------------------------------
// MASTER USER FUNCTIONS
// ----------------------------------------------------------------------

/** * 7. नया यूजर बनाता है। (व्यवस्थापन/Admin द्वारा बनाया गया उपयोगकर्ता)।
 * @async
 * @function createUser
 * @param {object} req - Express Request Object. req.body में `email`, `password`, `full_name`, और `role_id` होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 201 (Created) or 400/409/500.
 * * @throws {400} यदि कोई आवश्यक फ़ील्ड (email, password, full_name, role_id) अनुपस्थित है।
 * @throws {409} यदि ईमेल पहले से मौजूद है (`userModel.getUserByUsernameWithHash` द्वारा जाँचा गया)।
 * * @detail सुरक्षा: bcrypt का उपयोग करके पासवर्ड को DB में संग्रहीत करने से पहले हैश किया जाता है। सादा पाठ (plain text) पासवर्ड डेटाबेस में नहीं जाता है।
 */
const createUser = async (req, res) => {
    try {
        const { email, password, full_name, role_id } = req.body;
        
        if (!email || !password || !full_name || !role_id) {
            return res.status(400).json({ success: false, message: 'Missing required fields: email, password, full_name, role_id.' });
        }

        // चेक करें कि ईमेल पहले से मौजूद है या नहीं
        const existingUser = await userModel.getUserByUsernameWithHash(email);
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Username or Email already exists.' });
        }

        const password_hash = await hashPassword(password);
        
        const userData = { ...req.body, password_hash };
        delete userData.password; // सुरक्षा: सुनिश्चित करें कि सादा पाठ पासवर्ड आगे मॉडल को पास न हो
        
        const newUser = await userModel.createUser(userData);
        res.status(201).json({ success: true, message: 'User created successfully.', data: newUser });
    } catch (error) {
        console.error("Error in createUser:", error);
        res.status(500).json({ success: false, message: 'Failed to create user.' });
    }
};

/** * 8. सभी यूजर्स को प्राप्त करता है।
 * @async
 * @function getAllUsers
 * @param {object} req - Express Request Object. req.query में `limit`, `offset`, `search`, `roleId`, और `isActive` जैसे Pagination/Filter विकल्प हो सकते हैं।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) जिसमें `data` के अंदर users की सूची और कुल संख्या (total count) शामिल है।
 * * @detail अनुरोध (request) से प्राप्त string query parameters को आवश्यक संख्या (number) या बूलियन (boolean) प्रारूपों में नियंत्रित और पार्स (parse) किया जाता है।
 */
const getAllUsers = async (req, res) => {
    try {
        const { limit, offset, search, roleId, isActive } = req.query;
        const options = {
            limit: parseInt(limit, 10) || 10,
            offset: parseInt(offset, 10) || 0,
            search: search,
            roleId: roleId ? parseInt(roleId, 10) : null,
            isActive: isActive !== undefined ? (isActive === 'true') : null, // 'true'/'false' string को boolean में बदलें
        };

        const result = await userModel.getAllUsers(options);
        res.status(200).json({ 
            success: true, 
            message: 'Users fetched successfully.', 
            data: result 
        });
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch users.',
            error: error.message
        });
    }
};

/** * 9. ID द्वारा यूजर को प्राप्त करता है।
 * @async
 * @function getUserById
 * @param {object} req - Express Request Object. req.params में `userId` होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) or 404/500.
 * * @throws {404} यदि ID से कोई उपयोगकर्ता नहीं मिला।
 */
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await userModel.getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(200).json({ success: true, message: 'User fetched successfully.', data: user });
    } catch (error) {
        console.error("Error in getUserById:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch user.' });
    }
};

/** * 10. ID द्वारा यूजर डेटा को अपडेट करता है।
 * @async
 * @function updateUser
 * @param {object} req - Express Request Object. req.params में `userId` और req.body में अपडेटेड डेटा होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) or 404/500.
 * * @throws {404} यदि उपयोगकर्ता नहीं मिला या कोई परिवर्तन नहीं किया गया।
 */
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const updatedUser = await userModel.updateUser(userId, req.body);
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found or nothing to update.' });
        }
        res.status(200).json({ success: true, message: 'User updated successfully.', data: updatedUser });
    } catch (error) {
        console.error("Error in updateUser:", error);
        res.status(500).json({ success: false, message: 'Failed to update user.' });
    }
};

/** * 11. यूजर को हटाता है। (कार्यान्वयन `userModel.deactivateUser` का उपयोग करके सॉफ्ट डिलीट है, जो `is_active=FALSE` सेट करता है)।
 * @async
 * @function deleteUser
 * @param {object} req - Express Request Object. req.params में `userId` होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) या 404/500.
 * * @throws {404} यदि उपयोगकर्ता नहीं मिला या पहले से ही निष्क्रिय है।
 */
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const deactivatedUser = await userModel.deactivateUser(userId); // माना जाता है कि मॉडल सॉफ्ट डिलीट करता है
        if (!deactivatedUser) {
            return res.status(404).json({ success: false, message: 'User not found or already inactive.' });
        }
        res.status(200).json({ success: true, message: 'User deactivated successfully.' });
    } catch (error) {
        console.error("Error in deleteUser/deactivateUser:", error);
        res.status(500).json({ success: false, message: 'Failed to deactivate user.' });
    }
};


/** * 12. सभी सक्रिय इंस्पेक्टर्स को प्राप्त करता है (Lookup List)।
 * @async
 * @function getActiveInspectors
 * @param {object} req - Express Request Object.
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) जिसमें सक्रिय इंस्पेक्टर्स की सूची शामिल है।
 */
const getActiveInspectors = async (req, res) => {
    try {
        const inspectors = await userModel.getActiveInspectors();
        res.status(200).json({
            success: true,
            message: 'Active inspectors fetched successfully.',
            data: inspectors,
        });
    } catch (error) {
        console.error("Error in getActiveInspectors:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch active inspectors.',
            error: error.message 
        });
    }
};

/** * 13. 🔑 NEW: यूजर के 'is_verified' स्थिति को टॉगल करता है। (व्यवस्थापन नियंत्रण/Admin control)।
 * @async
 * @function toggleUserVerification
 * @param {object} req - Express Request Object. req.params में `userId` और req.body में `is_verified` (boolean) होना चाहिए।
 * @param {object} res - Express Response Object.
 * @returns {void} JSON response with status 200 (OK) or 400/404/500.
 * * @throws {400} यदि `is_verified` बूलियन (boolean) नहीं है।
 * @throws {404} यदि उपयोगकर्ता नहीं मिला।
 * @detail यह फ़ंक्शन उपयोगकर्ता को मैन्युअल रूप से सत्यापित (verify) करने या सत्यापन रद्द (unverify) करने के लिए उपयोगी है।
 */
const toggleUserVerification = async (req, res) => {
    try {
        const { userId } = req.params;
        const { is_verified } = req.body; 
        
        if (typeof is_verified !== 'boolean') {
            return res.status(400).json({ success: false, message: 'is_verified must be a boolean.' });
        }

        // is_verified को updateUser मॉडल फ़ंक्शन में पास करें
        const updatedUser = await userModel.updateUser(userId, { is_verified });
        
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found or nothing to update.' });
        }
        res.status(200).json({ 
            success: true, 
            message: `User verification status set to ${is_verified}.`, 
            data: updatedUser 
        });
    } catch (error) {
        console.error("Error in toggleUserVerification:", error);
        res.status(500).json({ success: false, message: 'Failed to update user verification status.' });
    }
};


// ----------------------------------------------------------------------
// FINAL EXPORT
// ----------------------------------------------------------------------

module.exports = {
    // Role functions
    createRole, 
    getAllRoles, 
    getRoleById, 
    updateRole, 
    deleteRole,
    // 🛡️ NEW RBAC functions
    getAllPermissions, 
    setRolePermissions, 
    // User functions
    createUser, 
    getAllUsers, 
    getUserById, 
    updateUser, 
    deleteUser,
    getActiveInspectors, 
    toggleUserVerification, 
};