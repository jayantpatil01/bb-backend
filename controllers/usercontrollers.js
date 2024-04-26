const User = require('../models/userModel');
const HttpError = require('../models/errorModels');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs')
const path = require('path');
const { randomUUID } = require('crypto');
const {v4:uuid} =require('uuid');
const { error } = require('console');

////////////////////////////// Register For New User //////////////////////////
// POST : api/users/register
// Unprotected
const registerUser = async(req, res, next) => {
    try {
        const { name, email, password, password2 } = req.body;
        if (!name || !email || !password) {
            return next(new HttpError("Fill the details in All Required Field", 422));
        }
        const newEmail = email.toLowerCase();
        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return next(new HttpError("Email Already Exits", 422));
        }
        if (password.trim().length < 6) {
            return next(new HttpError("Password must be at least 6 characters long", 422));
        }
        if (password !== password2) {
            return next(new HttpError("Password and Confirm password should be the same", 422));
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);
        const newUser = await User.create({ name, email: newEmail, password: hashedPass });
        res.status(201).json(`New user ${newUser.email} registered`);
    } catch (error) {
        return next(new HttpError("User registration Failed", 422));
    }
}

/////////////////////////////// Login User/////////////////////////////////
// POST : api/users/login
// Unprotected
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new HttpError("Email and Password are required", 422));
        }
        const newEmail = email.toLowerCase();
        const userModel = await User.findOne({ email: newEmail });
        if (!userModel) {
            return next(new HttpError("Invalid credentials", 401)); // Use 401 for unauthorized
        }
        const comparePass = await bcrypt.compare(password, userModel.password);
        if (!comparePass) {
            return next(new HttpError("Invalid credentials", 401)); // Use 401 for unauthorized
        }
        const { _id: id, name } = userModel;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.status(200).json({ token, id, name });
    } catch (error) {
        console.error("User login failed:", error);
        return next(new HttpError("User login failed", 500)); 
    }
}

///////////////////////////// User Profile///////////////////////////
// POST : api/users/:id
// Protected
const getUser = async(req, res, next) => {
    try {
        const {id} =req.params;
        const user = await User.findById(id).select('-password')
        if(!user){
            return next (new HttpError("User not found " , 422))
        }
        res.status(200).json(user);
        
    } catch (error) {
        return next(new HttpError(error)); 
    }
}

/////////////////////////////////// Change Avatar/////////////////////////////
// POST : api/users/change-avatar
// Protected
const changeAvatar = async(req, res, next) => {
    try {
        if (!req.files || !req.files.avatar) {
            return next(new HttpError("Please choose an image", 422));
        }
        // Finding user from database
        const user = await User.findById(req.user.id);
        // Deleting user's old avatar
        if (user.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if (err) {
                    return next(new HttpError(err));
                }
            });
        }
        const { avatar } = req.files;
        // Check file size
        if (avatar.size > 500000) {
            return next(new HttpError("File size is too big. Should be less than 500kb", 422));
        }
        let filename = avatar.name;
        let splittedFilename = filename.split('.');
        let newFilename = splittedFilename[0] + uuid() + '.' + splittedFilename[splittedFilename.length - 1];
        avatar.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) => {
            if (err) {
                return next(new HttpError(err));
            }
            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, { avatar: newFilename }, { new: true });
            if (!updatedAvatar) {
                return next(new HttpError("Avatar couldn't be changed", 422));
            }
            res.status(200).json(updatedAvatar);
        });
    } catch (error) {
        return next(new HttpError(error));
    }
}


//////////////////////////// Edit user detail///////////////////////////
// POST : api/users/edit-detail
// Protected
const editUser = async (req, res, next) => {
    try {
        const { name, email, currentPassword, newPassword, confirmNewPassword } = req.body;
        if (!name || !email || !currentPassword || !newPassword || !confirmNewPassword) {
            return next(new HttpError("Fill all the required fields", 422));
        }

        // Get user from database
        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new HttpError("No user Found", 422));
        }

        // Make sure new email doesn't already exist
        const emailExist = await User.findOne({ email });
        if (emailExist && emailExist._id.toString() !== req.user.id.toString()) {
        return next(new HttpError("Email Already Exist", 422));
        }

        // Compare password to DB password
        const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validateUserPassword) {
            return next(new HttpError("Invalid current password", 422));
        }

        // Compare new password
        if (newPassword !== confirmNewPassword) {
            return next(new HttpError("New password does not match", 422));
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(confirmNewPassword, salt);

        // Update user info in database
        const newInfo = await User.findByIdAndUpdate(req.user.id, { name, email, password: hashedPassword }, { new: true });
        res.status(200).json(newInfo);
    } catch (error) {
        return next(new HttpError("Error occurred while editing user", 500));
    }
};










// Get Authors
// POST : api/users/authors
// Unprotected
const getAuthors = async(req, res, next) => {
    try {
        const authors = await User.find().select('-password');
        res.json(authors)
        
    } catch (error) {
        return next (new HttpError(error))
    }
}

module.exports = { registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors };







// 65fa602f54408cb91e86257d