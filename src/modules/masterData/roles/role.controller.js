/**
 * @fileoverview Master Role Management Controller.
 * @description यह मॉड्यूल भूमिकाओं (Roles) के लिए CRUD संचालन (Create, Read, Update, Delete) को
 * संभालता है। यह डेटा को मान्य करता है और व्यावसायिक लॉजिक को लागू करने के लिए रोल मॉडल को कॉल करता है।
 * API त्रुटियों को संभालने के लिए `APIError` का उपयोग करता है।
 * @module src/modules/masterData/roles/role.controller
 * @requires ./role.model
 * @requires ../../../utils/errorHandler
 */

const roleModel = require('./role.model');
const { APIError } = require('../../../utils/errorHandler'); 

// --- Core Helper Functions ---
/**
 * URL पैरामीटर से ID को पार्स और मान्य करता है।
 * @function handleIdValidation
 * @param {string} id - URL पैरामीटर से प्राप्त ID मान।
 * @param {string} [paramName='ID'] - उस पैरामीटर का नाम जिसे मान्य किया जा रहा है।
 * @returns {{error: APIError} | {id: number}} - यदि अमान्य है तो APIError ऑब्जेक्ट, अन्यथा पार्स की गई संख्यात्मक ID के साथ एक ऑब्जेक्ट।
 */
const handleIdValidation = (id, paramName = 'ID') => {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
        return { error: new APIError(`Invalid ${paramName} provided in the URL. Must be a positive integer.`, 400) };
    }
    return { id: parsedId };
};

/**
 * रोल क्रिएशन डेटा के लिए सत्यापन लॉजिक।
 * @function validateRoleCreation
 * @param {object} data - req.body. अपेक्षा है कि इसमें `role_name` हो।
 * @returns {void}
 * @throws {APIError} यदि `role_name` मौजूद नहीं है।
 */
const validateRoleCreation = (data) => {
    if (!data.role_name) {
        throw new APIError('Role name is required.', 400);
    }
};

/**
 * 1. GET: सभी सक्रिय Roles प्राप्त करें।
 * @async
 * @function getAllRoles
 * @param {object} req - Express Request Object.
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ रोल्स की सूची लौटाता है।
 * @route GET /api/roles
 */
exports.getAllRoles = async (req, res, next) => {
    try {
        const roles = await roleModel.findAll();
        res.status(200).json({
            status: 'success',
            count: roles.length,
            data: roles
        });
    } catch (error) {
        next(error); 
    }
};

/**
 * 2. POST: नया Role बनाएँ।
 * @async
 * @function createRole
 * @param {object} req - Express Request Object (अपेक्षा है कि req.body में role_name हो)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 201 Created के साथ बनाया गया रोल लौटाता है।
 * @route POST /api/roles
 */
exports.createRole = async (req, res, next) => {
    try {
        validateRoleCreation(req.body); 

        const { role_name, description } = req.body;
        
        // Note: डुप्लिकेट जाँच मॉडल द्वारा संभाली जानी चाहिए
        const newRole = await roleModel.create({ role_name, description });

        res.status(201).json({
            status: 'success',
            message: 'Role successfully created.',
            data: newRole
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 3. PATCH: ID द्वारा Role को अपडेट करें।
 * @async
 * @function updateRole
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.roleId और req.body में अपडेट डेटा हो)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ अपडेटेड रोल लौटाता है।
 * @route PATCH /api/roles/:roleId
 */
exports.updateRole = async (req, res, next) => {
    const { error, id: roleId } = handleIdValidation(req.params.roleId, 'Role ID');
    if (error) return next(error);

    const updateData = req.body;
    if (Object.keys(updateData).length === 0) {
        return next(new APIError('No fields provided for update.', 400));
    }

    try {
        const updatedRole = await roleModel.update(roleId, updateData);

        res.status(200).json({
            status: 'success',
            message: 'Role successfully updated.',
            data: updatedRole
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 4. DELETE: ID द्वारा Role को डिलीट करें (सॉफ्ट डिलीट)।
 * @async
 * @function deleteRole
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.roleId हो)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ सफलता संदेश लौटाता है।
 * @route DELETE /api/roles/:roleId
 */
exports.deleteRole = async (req, res, next) => {
    const { error, id: roleId } = handleIdValidation(req.params.roleId, 'Role ID');
    if (error) return next(error);

    try {
        // Note: मॉडल को यह जाँच करनी चाहिए कि रोल उपयोग में है या नहीं।
        const result = await roleModel.remove(roleId);
        
        res.status(200).json({
            status: 'success',
            message: result.message // सफलता या सूचना संदेश
        });
    } catch (error) {
        next(error);
    }
};

/**
 * 5. GET: ID द्वारा एक Role प्राप्त करें।
 * @async
 * @function getRoleById
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.roleId हो)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ रोल डिटेल लौटाता है।
 * @route GET /api/roles/:roleId
 */
exports.getRoleById = async (req, res, next) => {
    const { error, id: roleId } = handleIdValidation(req.params.roleId, 'Role ID');
    if (error) return next(error);

    try {
        // Note: मॉडल को रोल न मिलने पर 404 त्रुटि फेंकनी चाहिए।
        const role = await roleModel.findById(roleId);
        res.status(200).json({ status: 'success', data: role });
    } catch (error) {
        next(error);
    }
};