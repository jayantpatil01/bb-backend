const express = require('express');
const router = express.Router(); 
const { registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors } = require('../controllers/usercontrollers');
const authMiddleware =require('../middleware/authMiddleware')
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/:id', getUser);
router.get('/', getAuthors);
router.post('/change-avatar',authMiddleware, changeAvatar); 
router.patch('/edit-user',authMiddleware, editUser);


module.exports = router;
