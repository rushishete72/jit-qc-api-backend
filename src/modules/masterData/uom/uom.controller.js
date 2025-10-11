/**
 * @fileoverview Master Unit of Measurement (UOM) Controller.
 * @description यह मॉड्यूल UOMs के लिए CRUD और व्यावसायिक लॉजिक को संभालता है। इसमें ID सत्यापन,
 * इनपुट जाँच और UOM को निष्क्रिय करने से पहले यह जाँच शामिल है कि वह उपयोग में है या नहीं।
 * @module src/modules/masterData/uom/uom.controller
 * @requires ./uom.model
 * @requires ../../../utils/errorHandler
 */

const uomModel = require('./uom.model');
const { APIError } = require('../../../utils/errorHandler');
// 💡 Note: आपके कोड से Validation फ़ंक्शंस को यहाँ इंपोर्ट करने की आवश्यकता होगी
// const { validateUomCreation, validateUomUpdate } = require('../../../utils/validation'); 

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
        return { error: new APIError(`Invalid ${paramName} provided in the URL.`, 400) };
    }
    return { id: parsedId };
};

// =========================================================================
// A. MASTER UOM CONTROLLERS (Unit of Measurement)
// =========================================================================

/**
 * 1. POST: एक नया UOM बनाता है।
 * @async
 * @function createUom
 * @param {object} req - Express Request Object (अपेक्षा है कि req.body में name और symbol हो)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 201 Created के साथ बनाया गया UOM लौटाता है।
 * @route POST /api/uoms
 */
exports.createUom = async (req, res, next) => {
    const uomData = req.body;
    // const validationError = validateUomCreation(uomData); // Real validation goes here
    // if (validationError) return next(new APIError(validationError, 400));
    
    if (!uomData.name || !uomData.symbol) return next(new APIError('UOM name and symbol are required.', 400));

    try {
        const newUom = await uomModel.createUom(uomData);
        return res.status(201).json({ 
            message: `UOM '${newUom.name}' created successfully.`, 
            data: newUom 
        });
    } catch (error) {
        next(error); 
    }
};

/**
 * 2. GET: ID द्वारा एक विशिष्ट UOM प्राप्त करता है।
 * @async
 * @function getUomById
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.uomId हो)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ UOM डिटेल लौटाता है।
 * @route GET /api/uoms/:uomId
 */
exports.getUomById = async (req, res, next) => {
    const { error, id: uomId } = handleIdValidation(req.params.uomId, 'UOM ID');
    if (error) return next(error);

    try {
        const uom = await uomModel.getUomById(uomId);
        if (!uom) return next(new APIError(`UOM with ID ${uomId} not found.`, 404));
        return res.status(200).json({ data: uom });
    } catch (error) {
        next(error); 
    }
};

/**
 * 3. GET: फ़िल्टर और सर्च क्षमताओं के साथ सभी UOMs प्राप्त करता है।
 * @async
 * @function getAllUoms
 * @param {object} req - Express Request Object (Query params: search, isActive)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ UOMs की सूची लौटाता है।
 * @route GET /api/uoms
 */
exports.getAllUoms = async (req, res, next) => {
    try {
        // Query पैरामीटर्स को सुरक्षित रूप से पार्स करें
        const search = req.query.search ? req.query.search.trim() : null;
        const isActive = req.query.isActive === 'false' ? false : (req.query.isActive === 'true' ? true : null);
        
        const uoms = await uomModel.getAllUoms({ search, isActive });

        return res.status(200).json({ 
            message: 'Master UOMs retrieved successfully.', 
            data: uoms 
        });
    } catch (error) {
        next(error); 
    }
};

/**
 * 4. PUT/PATCH: ID द्वारा एक मौजूदा UOM को अपडेट करता है।
 * @async
 * @function updateUom
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.uomId और req.body में अपडेट डेटा हो)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ अपडेटेड UOM लौटाता है।
 * @route PUT /api/uoms/:uomId
 */
exports.updateUom = async (req, res, next) => {
    const { error, id: uomId } = handleIdValidation(req.params.uomId, 'UOM ID');
    if (error) return next(error);

    const updateData = req.body;
    // const validationError = validateUomUpdate(updateData); // Real validation goes here
    // if (validationError) return next(new APIError(validationError, 400)); 
    
    if (Object.keys(updateData).length === 0) return next(new APIError('No data provided for update.', 400));

    try {
        const updatedUom = await uomModel.updateUom(uomId, updateData);
        return res.status(200).json({ 
            message: `UOM (ID: ${uomId}) updated successfully.`, 
            data: updatedUom 
        });
    } catch (error) {
        next(error); 
    }
};

/**
 * 5. PATCH/DELETE: ID द्वारा एक UOM को निष्क्रिय (Deactivate) करता है।
 * @async
 * @function deactivateUom
 * @param {object} req - Express Request Object (अपेक्षा है कि req.params.uomId हो)।
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ निष्क्रिय UOM लौटाता है।
 * @route PATCH /api/uoms/:uomId/deactivate
 */
exports.deactivateUom = async (req, res, next) => {
    const { error, id: uomId } = handleIdValidation(req.params.uomId, 'UOM ID');
    if (error) return next(error);
    
    try {
        // 🔑 Business Logic Check: पार्ट द्वारा उपयोग किए जाने पर निष्क्रिय न करें
        const isInUse = await uomModel.isUomInUse(uomId);
        if (isInUse) {
            return next(new APIError('Cannot deactivate UOM: It is currently used by one or more Master Parts.', 409));
        }

        const deactivated = await uomModel.deactivateUom(uomId);
        if (!deactivated) {
            return next(new APIError(`UOM with ID ${uomId} not found or already inactive.`, 404));
        }
        return res.status(200).json({
            message: `UOM (ID: ${uomId}) successfully deactivated.`,
            data: deactivated,
        });
    } catch (error) {
        next(error);
    }
};