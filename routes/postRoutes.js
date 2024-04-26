const { Router } = require('express');
const router = Router();
const {createPost,getPosts,getPost,getCatPost,getUserPosts,editPost,deletePost,removeEventListener} = require('../controllers/postcontrollers')
const authMiddleware = require('../middleware/authMiddleware')

router.post('/', authMiddleware,createPost)
router.get('/', getPosts)
router.get('/:id', getPost)
router.get('/categories/:category', getCatPost)
router.get('/users/:id', getUserPosts)
router.patch('/:id',authMiddleware,editPost)
router.delete('/:id', authMiddleware ,deletePost)

module.exports = router;
