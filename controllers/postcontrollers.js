const Post = require("../models/postModels");
const User = require('../models/userModel');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const HttpError = require('../models/errorModels');

/////////////////////////////////// CREATE A POST /////////////////////////////////////
// POST: api/posts
// protected
const createPost = async (req, res, next) => {
    try {
        let { title, category, description } = req.body;
        if (!title || !category || !description || !req.files) {
            return next(new HttpError("Fill all the details and choose the thumbnails"));
        }
        const { thumbnail } = req.files;
        // Check file size
        if (thumbnail.size > 7000000) {
            return next(new HttpError("Image is too big. File should be less than 7mb"));
        }
        let filename = thumbnail.name;
        let splittedfilename = filename.split('.');
        let newFileName = splittedfilename[0] + uuid() + "." + splittedfilename[splittedfilename.length - 1];
        thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
            if (err) {
                return next(new HttpError(err));
            } else {
                const newPost = await Post.create({ title, category, description, thumbnail: newFileName, creator: req.user.id });
                if (!newPost) {
                    return next(new HttpError("Post can not be created", 422));
                }
                // Finding user and increasing post count
                const currentUser = await User.findById(req.user.id);
                currentUser.posts = currentUser.posts + 1; // Increment the posts count
                await currentUser.save(); // Save the updated user document

                res.status(201).json(newPost);
            }
        });
    } catch (error) {
        return next(new HttpError(error), 422);
    }
};

/////////////////////////////////// Get all posts /////////////////////////////////////
// POST: api/posts
// unprotected
const getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find().sort({ updatedAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
};

/////////////////////////////////// Get single post /////////////////////////////////////
// GET: api/posts/:id
// unprotected
const getPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if (!post || post === null) {
            return next(new HttpError("Post not found"));
        }
        res.status(200).json(post); // Send the found post if it exists
    } catch (error) {
        return next(new HttpError(error));
    }
};

/////////////////////////////////// Get posts by categories /////////////////////////////////////
// GET: api/posts/categories/:category
// unprotected
const getCatPost = async (req, res, next) => {
    try {
        const { category } = req.params;
        const catPosts = await Post.find({ category }).sort({ createdAt: -1 });
        res.status(200).json(catPosts);
    } catch (error) {
        return next(new HttpError(error));
    }
};

/////////////////////////////////// Get Users/Authors posts /////////////////////////////////////
// GET: api/posts/users/:id
// unprotected
const getUserPosts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
};

/////////////////////////////////// Edit post /////////////////////////////////////
// PATCH: api/posts/:id
// unprotected
const editPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        let { title, category, description } = req.body;

        // Check if description exists
        if (!title || !category || !description || description.length < 12) {
            return next(new HttpError("Fill in all the fields and ensure description is at least 12 characters long", 422));
        }

        let updatedPost;

        if (!req.files) {
            updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true });
        } else {
            const oldPost = await Post.findById(postId);
            if (!oldPost) {
                return next(new HttpError("Post not found", 404));
            }

            // Check if thumbnail exists
            if (oldPost.thumbnail) {
                // Delete old thumbnail
                try {
                    fs.unlinkSync(path.join(__dirname, '..', 'uploads', oldPost.thumbnail));
                } catch (err) {
                    console.error("Error deleting old thumbnail:", err);
                    // Handle the error or log it as per your requirement
                }
            }

            // Upload new thumbnail
            const { thumbnail } = req.files;
            if (thumbnail.size > 2000000) {
                return next(new HttpError("Thumbnail is too big. File size must be less than 2mb", 422));
            }
            let fileName = thumbnail.name;
            let splittedFileName = fileName.split('.');
            let newFileName = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length - 1];
            await thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName));

            updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description, thumbnail: newFileName }, { new: true });
        }

        if (!updatedPost) {
            return next(new HttpError("Couldn't update the post"));
        }
        res.status(200).json(updatedPost);
    } catch (error) {
        return next(new HttpError(error.message));
    }
};

/////////////////////////////////// Delete post /////////////////////////////////////
// DELETE: api/posts/:id
// unprotected
const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return next(new HttpError("Post unavailable", 422));
        } 
        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError("Post not found", 404));
        }
        const fileName = post.thumbnail;
        if (req.user.id == post.creator) {
            // Delete thumbnail from folder 
            fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
                if (err) {
                    return next(new HttpError(err));
                } else {
                    // Delete post
                    await Post.findByIdAndDelete(postId);
                    // Decrement user's post count
                    await User.findByIdAndUpdate(req.user.id, { $inc: { posts: -1 } });
                    res.json(`Post ${postId} deleted successfully`);
                }
            });
        } else {
            return next(new HttpError("Unauthorized", 403));
        }
    } catch (error) {
        return next(new HttpError(error));
    }
};


module.exports = {
    createPost,
    getPosts,
    getPost,
    getCatPost,
    getUserPosts,
    editPost,
    deletePost
};
