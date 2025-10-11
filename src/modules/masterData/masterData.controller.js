/**
 * @fileoverview Master Data Combined Controller.
 * @description यह मॉड्यूल Master Data के सभी चार उप-घटकों (Part, UOM, Supplier, Client) के लिए
 * एकीकृत कंट्रोलर लॉजिक को संभालता है। इसमें इनपुट सत्यापन, विशिष्ट व्यावसायिक नियम,
 * डेटाबेस मॉडल के साथ इंटरैक्शन, और त्रुटि प्रबंधन शामिल है।
 * @module modules/masterData/masterData.controller
 * @requires ./masterData.model
 * @requires ../../utils/validation
 */

const masterModel = require('./masterData.model'); 
const { 
    validatePartCreation, 
    validatePartUpdate,
    validateUomCreation, 
    validateUomUpdate,
    validateSupplierCreation, 
    validateSupplierUpdate, 
    validateClientCreation, 
    validateClientUpdate, 
} = require('../../utils/validation'); 

// --- Core Helper Functions ---

/**
 * URL से प्राप्त ID को मान्य (Validate) और पार्स (Parse) करता है।
 * यह जांचता है कि ID एक सकारात्मक पूर्णांक है।
 * @param {string} id - URL पैरामीटर से प्राप्त ID स्ट्रिंग।
 * @param {string} [paramName='ID'] - ID का नाम (त्रुटि संदेश के लिए)।
 * @returns {{error: string} | {id: number}} - यदि अमान्य है तो एक त्रुटि स्ट्रिंग के साथ एक ऑब्जेक्ट, अन्यथा पार्स की गई संख्यात्मक ID के साथ एक ऑब्जेक्ट।
 */
const handleIdValidation = (id, paramName = 'ID') => {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
        return { error: `Invalid ${paramName} provided in the URL.` };
    }
    return { id: parsedId };
};

// ----------------================================================---------
// 1. MASTER PART CONTROLLERS (8 API Endpoints)
// ----------------================================================---------

/**
 * एक नया मास्टर पार्ट बनाता है।
 * इसमें डुप्लीकेट पार्ट नंबर/रिवीजन और फॉरेन की उल्लंघन की जाँच शामिल है।
 * @async
 * @function createMasterPart
 * @param {object} req - Express Request Object.
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 201 Created के साथ बनाया गया पार्ट लौटाता है।
 */
const createMasterPart = async (req, res, next) => {
    const partData = req.body;
    
    if (!partData || typeof partData !== 'object' || Object.keys(partData).length === 0) {
        return res.status(400).json({ error: "Request body cannot be empty. Please provide JSON data." });
    }

    const validationError = validatePartCreation(partData); 
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const { 
        part_no, rev_no, part_name, drawing_no, uom_id, 
        std_weight_gm, material_spec, surface_treatment, 
        qc_required, std_lead_time_days, default_supplier_id, 
        default_client_id 
    } = partData; 
    
    // डेटा को Model के लिए तैयार करें (Data Cleaning/Type Casting)
    const partToCreate = {
        part_no, rev_no, part_name, drawing_no, uom_id: Number(uom_id), 
        std_weight_gm: std_weight_gm ? Number(std_weight_gm) : null,
        material_spec, surface_treatment, 
        qc_required: !!qc_required, 
        std_lead_time_days: std_lead_time_days ? Number(std_lead_time_days) : 0,
        default_supplier_id: default_supplier_id ? Number(default_supplier_id) : null,
        default_client_id: default_client_id ? Number(default_client_id) : null,
        // created_by, updated_by (Authentication के बाद जोड़ा जाएगा)
    };

    try {
        const partExists = await masterModel.checkPartExists(part_no, rev_no);
        if (partExists) {
            return res.status(409).json({
                error: `Part Number '${part_no}' with Revision '${rev_no}' already exists.`,
                part_id: partExists.part_id 
            });
        }

        const newPart = await masterModel.createPart(partToCreate);

        return res.status(201).json({ 
            message: 'Master Part created successfully.', 
            data: newPart 
        });

    } catch (error) {
        if (error.code === '23503') { // Foreign Key violation
            error.status = 400; 
            error.message = 'Invalid ID provided for UOM, Supplier, or Client. The referenced record does not exist.';
            return next(error); 
        }
        error.message = error.message || 'An unexpected error occurred during master part creation.';
        return next(error); 
    }
};

/**
 * सभी मास्टर पार्ट्स को पुनर्प्राप्त करता है, जिसमें पेजिंग, सर्च और निष्क्रिय रिकॉर्ड शामिल करने की क्षमता होती है।
 * @async
 * @function getAllMasterParts
 * @param {object} req - Express Request Object (Query params: page, limit, search, includeInactive).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ पार्ट्स और पेजिंग जानकारी लौटाता है।
 */
const getAllMasterParts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const search = req.query.search ? req.query.search.trim() : null;
        const includeInactive = req.query.includeInactive === 'true'; 

        const offset = (page - 1) * limit;
        
        const { data: parts, total_count } = await masterModel.getAllParts({
            limit, offset, search, includeInactive,
        });

        const totalPages = Math.ceil(total_count / limit);

        return res.status(200).json({ 
            message: 'Master Parts retrieved successfully.', 
            pagination: {
                total_records: total_count, total_pages: totalPages,
                current_page: page, limit: limit,
            },
            data: parts 
        });
    } catch (error) {
        return next(error); 
    }
};

/**
 * ID द्वारा एक विशिष्ट मास्टर पार्ट को पुनर्प्राप्त करता है।
 * @async
 * @function getMasterPartById
 * @param {object} req - Express Request Object (Param: partId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ पार्ट डेटा लौटाता है या 404 Not Found।
 */
const getMasterPartById = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });

    try {
        const part = await masterModel.getPartById(partId);
        
        if (!part) {
            return res.status(404).json({ error: `Master Part with ID ${partId} not found.` });
        }

        return res.status(200).json({ 
            message: 'Master Part retrieved successfully.', 
            data: part 
        });

    } catch (error) {
        return next(error); 
    }
};

/**
 * पार्ट नंबर और रिवीजन नंबर द्वारा एक विशिष्ट मास्टर पार्ट को पुनर्प्राप्त करता है।
 * @async
 * @function getMasterPartByNoRev
 * @param {object} req - Express Request Object (Params: partNo, revNo).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ पार्ट डेटा लौटाता है या 404 Not Found।
 */
const getMasterPartByNoRev = async (req, res, next) => {
    const { partNo, revNo } = req.params;

    if (!partNo || !revNo) {
        return res.status(400).json({ error: 'Part Number and Revision Number are required.' });
    }
    
    try {
        const part = await masterModel.getPartByPartNoRev(partNo, revNo);
        
        if (!part) {
            return res.status(404).json({ error: `Master Part with No. ${partNo} and Rev. ${revNo} not found.` });
        }

        return res.status(200).json({ 
            message: 'Master Part retrieved successfully.', 
            data: part 
        });

    } catch (error) {
        return next(error); 
    }
};


/**
 * ID द्वारा एक मौजूदा मास्टर पार्ट को अपडेट करता है।
 * इसमें डुप्लीकेट पार्ट नंबर/रिवीजन की जाँच और फॉरेन की उल्लंघन की जाँच शामिल है।
 * @async
 * @function updateMasterPart
 * @param {object} req - Express Request Object (Param: partId, Body: updateData).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ अपडेटेड पार्ट लौटाता है या 404/409 त्रुटि।
 */
const updateMasterPart = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });

    const updateData = req.body;
    
    const validationError = validatePartUpdate(updateData); 
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    
    // Unique Key Conflict Check
    if (updateData.part_no || updateData.rev_no) {
        const existingPart = await masterModel.checkPartExists(
            updateData.part_no || null,
            updateData.rev_no || null
        );
        
        if (existingPart && existingPart.part_id !== partId) {
            return res.status(409).json({
                error: `The Part Number and Revision combination already exists with ID ${existingPart.part_id}.`
            });
        }
    }

    try {
        const updatedPart = await masterModel.updatePart(partId, updateData);
        
        if (!updatedPart) {
            return res.status(404).json({ error: `Master Part with ID ${partId} not found.` });
        }

        return res.status(200).json({ 
            message: 'Master Part updated successfully.', 
            data: updatedPart 
        });

    } catch (error) {
        if (error.code === '23503') { // Foreign Key violation
            error.status = 400; 
            error.message = 'Invalid ID provided for UOM, Supplier, or Client. The referenced record does not exist.';
            return next(error); 
        }
        return next(error); 
    }
};


/**
 * ID द्वारा एक मास्टर पार्ट को निष्क्रिय (Deactivate) करता है (सॉफ्ट डिलीट)।
 * @async
 * @function deactivateMasterPart
 * @param {object} req - Express Request Object (Param: partId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ निष्क्रिय पार्ट लौटाता है या 404 त्रुटि।
 */
const deactivateMasterPart = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });
    
    try {
        const deactivatedPart = await masterModel.deactivatePart(partId);

        if (!deactivatedPart) {
            return res.status(404).json({ error: `Master Part with ID ${partId} not found or already inactive.` });
        }
        
        return res.status(200).json({
            message: `Master Part (ID: ${partId}) deactivated successfully.`,
            data: deactivatedPart,
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * ID द्वारा एक मास्टर पार्ट को सक्रिय (Activate) करता है।
 * @async
 * @function activateMasterPart
 * @param {object} req - Express Request Object (Param: partId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ सक्रिय पार्ट लौटाता है या 404 त्रुटि।
 */
const activateMasterPart = async (req, res, next) => {
    const { error, id: partId } = handleIdValidation(req.params.partId, 'Part ID');
    if (error) return res.status(400).json({ error });
    
    try {
        const activatedPart = await masterModel.activatePart(partId);

        if (!activatedPart) {
            return res.status(404).json({ error: `Master Part with ID ${partId} not found or already active.` });
        }
        
        return res.status(200).json({
            message: `Master Part (ID: ${partId}) activated successfully.`,
            data: activatedPart,
        });

    } catch (error) {
        return next(error);
    }
};


// ----------------================================================---------
// 2. UOM CONTROLLERS (4 API Endpoints)
// ----------------================================================---------

/**
 * एक नया Unit of Measurement (UOM) बनाता है।
 * इसमें डुप्लीकेट UOM कोड की जाँच शामिल है।
 * @async
 * @function createMasterUom
 * @param {object} req - Express Request Object (Body: uom_code, uom_name).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 201 Created के साथ बनाया गया UOM लौटाता है।
 */
const createMasterUom = async (req, res, next) => {
    const uomData = req.body;
    
    const validationError = validateUomCreation(uomData); 
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const { uom_code, uom_name } = uomData; 
    
    try {
        const uomExists = await masterModel.checkUomExists(uom_code);
        if (uomExists) {
            return res.status(409).json({
                error: `UOM Code '${uom_code}' already exists.`,
                uom_id: uomExists.uom_id 
            });
        }

        const newUom = await masterModel.createUom({ uom_code, uom_name });

        return res.status(201).json({ 
            message: 'Unit of Measurement created successfully.', 
            data: newUom 
        });

    } catch (error) {
        error.message = error.message || 'An unexpected error occurred during UOM creation.';
        return next(error); 
    }
};

/**
 * सभी UOMs को पुनर्प्राप्त करता है।
 * @async
 * @function getAllMasterUoms
 * @param {object} req - Express Request Object (Query params: includeInactive).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ UOMs की सूची लौटाता है।
 */
const getAllMasterUoms = async (req, res, next) => {
    try {
        const includeInactive = req.query.includeInactive === 'true'; 
        
        const uoms = await masterModel.getAllUoms({ includeInactive });
        
        return res.status(200).json({ 
            message: 'All Units of Measurement retrieved successfully.', 
            count: uoms.length,
            data: uoms 
        });
    } catch (error) {
        return next(error); 
    }
};

/**
 * ID द्वारा एक मौजूदा UOM को अपडेट करता है।
 * @async
 * @function updateMasterUom
 * @param {object} req - Express Request Object (Param: uomId, Body: updateData).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ अपडेटेड UOM लौटाता है या 404/409 त्रुटि।
 */
const updateMasterUom = async (req, res, next) => {
    const { error, id: uomId } = handleIdValidation(req.params.uomId, 'UOM ID');
    if (error) return res.status(400).json({ error });

    const updateData = req.body;
    
    const validationError = validateUomUpdate(updateData); 
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        // Model में updateUom मौजूद होना चाहिए
        const updatedUom = await masterModel.updateUom(uomId, updateData); 
        
        if (!updatedUom) {
            return res.status(404).json({ error: `UOM with ID ${uomId} not found.` });
        }

        return res.status(200).json({ 
            message: 'Unit of Measurement updated successfully.', 
            data: updatedUom 
        });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation (UOM Code duplicate)
            error.status = 409; 
            error.message = 'The UOM Code already exists for another record.';
            return next(error);
        }
        return next(error); 
    }
};

/**
 * ID द्वारा एक UOM को निष्क्रिय (Deactivate) करता है (सॉफ्ट डिलीट)।
 * इसमें Foreign Key उल्लंघन की जाँच शामिल है यदि UOM का उपयोग किसी पार्ट द्वारा किया जा रहा है।
 * @async
 * @function deactivateMasterUom
 * @param {object} req - Express Request Object (Param: uomId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ निष्क्रिय UOM लौटाता है या 404/409 त्रुटि।
 */
const deactivateMasterUom = async (req, res, next) => {
    const { error, id: uomId } = handleIdValidation(req.params.uomId, 'UOM ID');
    if (error) return res.status(400).json({ error });
    
    try {
        const deactivatedUom = await masterModel.deactivateUom(uomId);

        if (!deactivatedUom) {
            return res.status(404).json({ error: `UOM with ID ${uomId} not found or already inactive.` });
        }
        
        return res.status(200).json({
            message: `UOM (ID: ${uomId}) deactivated successfully.`,
            data: deactivatedUom,
        });

    } catch (error) {
        if (error.code === '23503') { // Foreign Key violation (UOM is used by a Part)
            error.status = 409; 
            error.message = `Cannot deactivate UOM ID ${uomId}. It is currently referenced by one or more Master Parts.`;
            return next(error); 
        }
        return next(error);
    }
};


// ----------------================================================---------
// 3. SUPPLIER CONTROLLERS (6 API Endpoints)
// ----------------================================-------------------------

/**
 * एक नया मास्टर सप्लायर बनाता है।
 * इसमें डुप्लीकेट सप्लायर कोड की जाँच शामिल है।
 * @async
 * @function createMasterSupplier
 * @param {object} req - Express Request Object (Body: supplierData).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 201 Created के साथ बनाया गया सप्लायर लौटाता है।
 */
const createMasterSupplier = async (req, res, next) => {
    const supplierData = req.body;
    
    const validationError = validateSupplierCreation(supplierData); 
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const { supplier_code } = supplierData;
    
    try {
        const supplierExists = await masterModel.checkSupplierExists(supplier_code);
        if (supplierExists) {
            return res.status(409).json({
                error: `Supplier Code '${supplier_code}' already exists.`,
                supplier_id: supplierExists.supplier_id 
            });
        }

        const newSupplier = await masterModel.createSupplier(supplierData);

        return res.status(201).json({ 
            message: 'Master Supplier created successfully.', 
            data: newSupplier 
        });

    } catch (error) {
        error.message = error.message || 'An unexpected error occurred during supplier creation.';
        return next(error); 
    }
};

/**
 * सभी मास्टर सप्लायरों को पुनर्प्राप्त करता है, जिसमें पेजिंग, सर्च और निष्क्रिय रिकॉर्ड शामिल करने की क्षमता होती है।
 * @async
 * @function getAllMasterSuppliers
 * @param {object} req - Express Request Object (Query params: page, limit, search, includeInactive).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ सप्लायर और पेजिंग जानकारी लौटाता है।
 */
const getAllMasterSuppliers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const search = req.query.search ? req.query.search.trim() : null;
        const includeInactive = req.query.includeInactive === 'true'; 

        const offset = (page - 1) * limit;
        
        const { data: suppliers, total_count } = await masterModel.getAllSuppliers({
            limit, offset, search, includeInactive,
        });

        const totalPages = Math.ceil(total_count / limit);

        return res.status(200).json({ 
            message: 'Master Suppliers retrieved successfully.', 
            pagination: {
                total_records: total_count, total_pages: totalPages,
                current_page: page, limit: limit,
            },
            data: suppliers 
        });
    } catch (error) {
        return next(error); 
    }
};

/**
 * ID द्वारा एक विशिष्ट मास्टर सप्लायर को पुनर्प्राप्त करता है।
 * @async
 * @function getMasterSupplierById
 * @param {object} req - Express Request Object (Param: supplierId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ सप्लायर डेटा लौटाता है या 404 Not Found।
 */
const getMasterSupplierById = async (req, res, next) => {
    const { error, id: supplierId } = handleIdValidation(req.params.supplierId, 'Supplier ID');
    if (error) return res.status(400).json({ error });

    try {
        const supplier = await masterModel.getSupplierById(supplierId);
        
        if (!supplier) {
            return res.status(404).json({ error: `Master Supplier with ID ${supplierId} not found.` });
        }

        return res.status(200).json({ 
            message: 'Master Supplier retrieved successfully.', 
            data: supplier 
        });

    } catch (error) {
        return next(error); 
    }
};

/**
 * ID द्वारा एक मौजूदा मास्टर सप्लायर को अपडेट करता है।
 * @async
 * @function updateMasterSupplier
 * @param {object} req - Express Request Object (Param: supplierId, Body: updateData).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ अपडेटेड सप्लायर लौटाता है या 404/409 त्रुटि।
 */
const updateMasterSupplier = async (req, res, next) => {
    const { error, id: supplierId } = handleIdValidation(req.params.supplierId, 'Supplier ID');
    if (error) return res.status(400).json({ error });

    const updateData = req.body;
    
    const validationError = validateSupplierUpdate(updateData); 
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const updatedSupplier = await masterModel.updateSupplier(supplierId, updateData);
        
        if (!updatedSupplier) {
            return res.status(404).json({ error: `Master Supplier with ID ${supplierId} not found.` });
        }

        return res.status(200).json({ 
            message: 'Master Supplier updated successfully.', 
            data: updatedSupplier 
        });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation (Supplier Code duplicate)
            error.status = 409; 
            error.message = 'The Supplier Code already exists for another record.';
            return next(error);
        }
        return next(error); 
    }
};

/**
 * ID द्वारा एक मास्टर सप्लायर को निष्क्रिय (Deactivate) करता है (सॉफ्ट डिलीट)।
 * इसमें Foreign Key उल्लंघन की जाँच शामिल है यदि सप्लायर का उपयोग किसी पार्ट के डिफ़ॉल्ट सप्लायर के रूप में किया जा रहा है।
 * @async
 * @function deactivateMasterSupplier
 * @param {object} req - Express Request Object (Param: supplierId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ निष्क्रिय सप्लायर लौटाता है या 404/409 त्रुटि।
 */
const deactivateMasterSupplier = async (req, res, next) => {
    const { error, id: supplierId } = handleIdValidation(req.params.supplierId, 'Supplier ID');
    if (error) return res.status(400).json({ error });
    
    try {
        const deactivatedSupplier = await masterModel.deactivateSupplier(supplierId);

        if (!deactivatedSupplier) {
            return res.status(404).json({ error: `Master Supplier with ID ${supplierId} not found or already inactive.` });
        }
        
        return res.status(200).json({
            message: `Master Supplier (ID: ${supplierId}) deactivated successfully.`,
            data: deactivatedSupplier,
        });

    } catch (error) {
        if (error.code === '23503') { // Foreign Key violation (Supplier is used by a Part)
            error.status = 409; 
            error.message = `Cannot deactivate Supplier ID ${supplierId}. It is currently set as the default supplier for one or more Master Parts.`;
            return next(error); 
        }
        return next(error);
    }
};

/**
 * ID द्वारा एक मास्टर सप्लायर को सक्रिय (Activate) करता है।
 * @async
 * @function activateMasterSupplier
 * @param {object} req - Express Request Object (Param: supplierId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ सक्रिय सप्लायर लौटाता है या 404 त्रुटि।
 */
const activateMasterSupplier = async (req, res, next) => {
    const { error, id: supplierId } = handleIdValidation(req.params.supplierId, 'Supplier ID');
    if (error) return res.status(400).json({ error });
    
    try {
        const activatedSupplier = await masterModel.activateSupplier(supplierId); // Model में activateSupplier होना चाहिए

        if (!activatedSupplier) {
            return res.status(404).json({ error: `Master Supplier with ID ${supplierId} not found or already active.` });
        }
        
        return res.status(200).json({
            message: `Master Supplier (ID: ${supplierId}) activated successfully.`,
            data: activatedSupplier,
        });

    } catch (error) {
        return next(error);
    }
};


// ----------------================================================---------
// 4. CLIENT CONTROLLERS (6 API Endpoints)
// ----------------================================================---------

/**
 * एक नया मास्टर क्लाइंट बनाता है।
 * इसमें डुप्लीकेट क्लाइंट कोड की जाँच शामिल है।
 * @async
 * @function createMasterClient
 * @param {object} req - Express Request Object (Body: clientData).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 201 Created के साथ बनाया गया क्लाइंट लौटाता है।
 */
const createMasterClient = async (req, res, next) => {
    const clientData = req.body;
    
    const validationError = validateClientCreation(clientData); 
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const { client_code } = clientData;
    
    try {
        const clientExists = await masterModel.checkClientExists(client_code);
        if (clientExists) {
            return res.status(409).json({
                error: `Client Code '${client_code}' already exists.`,
                client_id: clientExists.client_id 
            });
        }

        const newClient = await masterModel.createClient(clientData);

        return res.status(201).json({ 
            message: 'Master Client created successfully.', 
            data: newClient 
        });

    } catch (error) {
        error.message = error.message || 'An unexpected error occurred during client creation.';
        return next(error); 
    }
};

/**
 * सभी मास्टर क्लाइंट्स को पुनर्प्राप्त करता है, जिसमें पेजिंग, सर्च और निष्क्रिय रिकॉर्ड शामिल करने की क्षमता होती है।
 * @async
 * @function getAllMasterClients
 * @param {object} req - Express Request Object (Query params: page, limit, search, includeInactive).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ क्लाइंट्स और पेजिंग जानकारी लौटाता है।
 */
const getAllMasterClients = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const search = req.query.search ? req.query.search.trim() : null;
        const includeInactive = req.query.includeInactive === 'true'; 

        const offset = (page - 1) * limit;
        
        const { data: clients, total_count } = await masterModel.getAllClients({
            limit, offset, search, includeInactive,
        });

        const totalPages = Math.ceil(total_count / limit);

        return res.status(200).json({ 
            message: 'Master Clients retrieved successfully.', 
            pagination: {
                total_records: total_count, total_pages: totalPages,
                current_page: page, limit: limit,
            },
            data: clients 
        });
    } catch (error) {
        return next(error); 
    }
};

/**
 * ID द्वारा एक विशिष्ट मास्टर क्लाइंट को पुनर्प्राप्त करता है।
 * @async
 * @function getMasterClientById
 * @param {object} req - Express Request Object (Param: clientId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ क्लाइंट डेटा लौटाता है या 404 Not Found।
 */
const getMasterClientById = async (req, res, next) => {
    const { error, id: clientId } = handleIdValidation(req.params.clientId, 'Client ID');
    if (error) return res.status(400).json({ error });

    try {
        const client = await masterModel.getClientById(clientId);
        
        if (!client) {
            return res.status(404).json({ error: `Master Client with ID ${clientId} not found.` });
        }

        return res.status(200).json({ 
            message: 'Master Client retrieved successfully.', 
            data: client 
        });

    } catch (error) {
        return next(error); 
    }
};

/**
 * ID द्वारा एक मौजूदा मास्टर क्लाइंट को अपडेट करता है।
 * @async
 * @function updateMasterClient
 * @param {object} req - Express Request Object (Param: clientId, Body: updateData).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ अपडेटेड क्लाइंट लौटाता है या 404/409 त्रुटि।
 */
const updateMasterClient = async (req, res, next) => {
    const { error, id: clientId } = handleIdValidation(req.params.clientId, 'Client ID');
    if (error) return res.status(400).json({ error });

    const updateData = req.body;
    
    const validationError = validateClientUpdate(updateData); 
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const updatedClient = await masterModel.updateClient(clientId, updateData);
        
        if (!updatedClient) {
            return res.status(404).json({ error: `Master Client with ID ${clientId} not found.` });
        }

        return res.status(200).json({ 
            message: 'Master Client updated successfully.', 
            data: updatedClient 
        });

    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation (Client Code duplicate)
            error.status = 409; 
            error.message = 'The Client Code already exists for another record.';
            return next(error);
        }
        return next(error); 
    }
};

/**
 * ID द्वारा एक मास्टर क्लाइंट को निष्क्रिय (Deactivate) करता है (सॉफ्ट डिलीट)।
 * इसमें Foreign Key उल्लंघन की जाँच शामिल है यदि क्लाइंट का उपयोग किसी पार्ट के डिफ़ॉल्ट क्लाइंट के रूप में किया जा रहा है।
 * @async
 * @function deactivateMasterClient
 * @param {object} req - Express Request Object (Param: clientId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ निष्क्रिय क्लाइंट लौटाता है या 404/409 त्रुटि।
 */
const deactivateMasterClient = async (req, res, next) => {
    const { error, id: clientId } = handleIdValidation(req.params.clientId, 'Client ID');
    if (error) return res.status(400).json({ error });
    
    try {
        const deactivatedClient = await masterModel.deactivateClient(clientId);

        if (!deactivatedClient) {
            return res.status(404).json({ error: `Master Client with ID ${clientId} not found or already inactive.` });
        }
        
        return res.status(200).json({
            message: `Master Client (ID: ${clientId}) deactivated successfully.`,
            data: deactivatedClient,
        });

    } catch (error) {
        if (error.code === '23503') { // Foreign Key violation (Client is used by a Part)
            error.status = 409; 
            error.message = `Cannot deactivate Client ID ${clientId}. It is currently set as the default client for one or more Master Parts.`;
            return next(error); 
        }
        return next(error);
    }
};

/**
 * ID द्वारा एक मास्टर क्लाइंट को सक्रिय (Activate) करता है।
 * @async
 * @function activateMasterClient
 * @param {object} req - Express Request Object (Param: clientId).
 * @param {object} res - Express Response Object.
 * @param {function} next - Express Next Function.
 * @returns {Promise<void>} - 200 OK के साथ सक्रिय क्लाइंट लौटाता है या 404 त्रुटि।
 */
const activateMasterClient = async (req, res, next) => {
    const { error, id: clientId } = handleIdValidation(req.params.clientId, 'Client ID');
    if (error) return res.status(400).json({ error });
    
    try {
        const activatedClient = await masterModel.activateClient(clientId); // Model में activateClient होना चाहिए

        if (!activatedClient) {
            return res.status(404).json({ error: `Master Client with ID ${clientId} not found or already active.` });
        }
        
        return res.status(200).json({
            message: `Master Client (ID: ${clientId}) activated successfully.`,
            data: activatedClient,
        });

    } catch (error) {
        return next(error);
    }
};


// ----------------================================================---------
// FINAL EXPORTS (All Controllers)
// ----------------================================================---------

module.exports = {
    // PART EXPORTS
    createMasterPart,
    getMasterPartById,
    getAllMasterParts,
    updateMasterPart,
    deactivateMasterPart, 
    activateMasterPart,   
    getMasterPartByNoRev, 
    
    // UOM EXPORTS
    createMasterUom,
    getAllMasterUoms,
    updateMasterUom, 
    deactivateMasterUom, 

    // SUPPLIER EXPORTS
    createMasterSupplier,
    getAllMasterSuppliers,
    getMasterSupplierById,
    updateMasterSupplier,
    deactivateMasterSupplier,
    activateMasterSupplier,

    // CLIENT EXPORTS
    createMasterClient,
    getAllMasterClients,
    getMasterClientById,
    updateMasterClient,
    deactivateMasterClient,
    activateMasterClient,
};