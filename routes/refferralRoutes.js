const refferralController = require('../controllers/refferralController')
const Auth = require('../middleware/authMiddleware')
const express = require('express')
const router = express.Router()

router.use(Auth.setAuthStatus)

router.get('/',refferralController.renderReferralPage)

module.exports = router