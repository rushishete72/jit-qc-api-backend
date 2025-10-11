/**
 * @fileoverview यह फ़ाइल कोर Express एप्लिकेशन बिल्डर (Builder) है।
 * यह सभी ग्लोबल मिडिलवेयर (सुरक्षा, CORS, JSON पार्सिंग) और रूट मॉड्यूल को लोड करता है।
 * यह फ़ाइल `server.js` द्वारा इंपोर्ट की जाती है और Express सर्वर को लॉन्च करने से पहले 
 * एप्लिकेशन ऑब्जेक्ट (`app`) को कॉन्फ़िगर करती है।
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet'); 

// 🔑 UTILITY IMPORTS
/**
 * @typedef {Object} APIError - कस्टम API त्रुटि क्लास।
 * @typedef {Function} errorHandlerMiddleware - सभी राउट्स और मिडिलवेयर के बाद 
 * आने वाला ग्लोबल एरर हैंडलिंग फ़ंक्शन।
 */
const { APIError, errorHandlerMiddleware } = require('./utils/errorHandler.js'); 

// 🎯 ROUTE IMPORTS
/**
 * @type {express.Router} apiRouter - मुख्य एग्रीगेटर राउटर जो सभी 
 * फ़ीचर-स्पेसिफिक राउट्स (जैसे users, products) को एक साथ जोड़ता है।
 */
const apiRouter = require('../routes/apiRouter.js'); 

/**
 * @type {express.Application} app - मुख्य Express एप्लिकेशन इंस्टेंस।
 */
const app = express();

/**
 * @type {string} NODE_ENV - वर्तमान ऑपरेटिंग एनवायरनमेंट ('development', 'production', आदि)
 * को परिभाषित करता है। डिफ़ॉल्ट रूप से 'development' पर सेट किया गया है।
 */
const NODE_ENV = process.env.NODE_ENV || 'development';


// -------------------------------------------------------------------------
// 1. GLOBAL MIDDLEWARES (Security & Parsing)
// -------------------------------------------------------------------------

/**
 * @middleware helmet
 * @description सुरक्षा संबंधी HTTP हेडर सेट करके एप्लिकेशन को कई 
 * ज्ञात वेब कमजोरियों (web vulnerabilities) से सुरक्षित करता है।
 */
app.use(helmet()); 

/**
 * @middleware cors
 * @description CORS (Cross-Origin Resource Sharing) को सक्षम करता है।
 * डिफ़ॉल्ट रूप से, यह सभी origins से आने वाले requests को अनुमति देता है।
 */
app.use(cors()); 

/**
 * @middleware express.json
 * @description आने वाले Requests के JSON पेलोड को पार्स करता है।
 * यह सुनिश्चित करता है कि `req.body` ऑब्जेक्ट में JSON डेटा उपलब्ध हो।
 * इसकी सीमा (limit) 100kb है, जिसे बढ़ाया जा सकता है यदि बड़े JSON पेलोड की आवश्यकता हो।
 */
app.use(express.json());


// -------------------------------------------------------------------------
// 2. SCALABLE ROUTERS LOADING (मॉड्यूल्स माउंट करें)
// -------------------------------------------------------------------------

/**
 * @middleware apiRouter
 * @description मुख्य API राउटिंग को '/api' बेस पाथ पर माउंट करता है। 
 * यह API का प्रवेश द्वार (entry point) है, जहाँ सभी फ़ीचर राउट्स एम्बेडेड हैं।
 */
app.use('/api', apiRouter); 


// -------------------------------------------------------------------------
// 3. CORE HEALTH CHECK & FALLBACKS
// -------------------------------------------------------------------------

/**
 * @route GET /
 * @description रूट पाथ के लिए एक बुनियादी हेल्थ चेक (Health Check)। 
 * यह बाहरी मॉनिटरिंग सिस्टम को यह जानने में मदद करता है कि सर्वर लाइव है।
 * @returns {Response} 200 OK - सर्विस के ऑपरेशनल होने की पुष्टि करता है।
 */
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'JIT/QC API Service Operational (Root)', 
        environment: NODE_ENV 
    });
});

/**
 * @route GET /api
 * @description API बेस राउट के लिए हेल्थ चेक। 
 * यह क्लाइंट को API संस्करण और दस्तावेज़ीकरण (documentation) के बारे में जानकारी देता है।
 * @returns {Response} 200 OK - बेस API राउट के ऑपरेशनल होने की पुष्टि।
 */
app.get('/api', (req, res) => {
    res.status(200).json({ 
        message: 'JIT/QC API Base Route Operational', 
        version: '1.0',
        docs: '/api/docs'
    });
});


/**
 * @middleware 404 Handler
 * @description किसी भी ऐसे रिक्वेस्ट को हैंडल करता है जो ऊपर परिभाषित किसी भी 
 * राउट से मैच नहीं करता है।
 * @param {express.Request} req - Express Request ऑब्जेक्ट।
 * @param {express.Response} res - Express Response ऑब्जेक्ट।
 * @param {express.NextFunction} next - अगले मिडिलवेयर को कॉल करने के लिए फ़ंक्शन।
 * @throws {APIError} 404 एरर को थ्रो करता है, जिसे फिर ग्लोबल एरर हैंडलर पकड़ता है।
 */
app.use((req, res, next) => {
    const error = new APIError(`Cannot find route: ${req.method} ${req.originalUrl}`, 404);
    next(error); 
});

/**
 * @middleware Global Error Handler
 * @description Express पाइपलाइन में थ्रो या पास की गई सभी त्रुटियों को कैप्चर करता है।
 * यह त्रुटियों को एक मानक JSON प्रतिक्रिया में बदलता है।
 */
app.use(errorHandlerMiddleware);


/**
 * @exports {express.Application} app - कॉन्फ़िगर किया गया Express एप्लिकेशन इंस्टेंस।
 * इसे `server.js` में इंपोर्ट और उपयोग किया जाता है।
 */
module.exports = app;