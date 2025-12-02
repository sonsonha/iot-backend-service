require('dotenv').config();
const bcrypt = require('bcrypt');
const JWT = require('jsonwebtoken');
//Model
const Cabinet = require('../models/Cabinet');
const modelUser = require('../models/Users');
const Relay = require('../models/Relay');
const HumiditySensors = require('../models/HumiditySensors');
const TemperatureSensors = require('../models/TemperatureSensors');
const Location = require('../models/Location');
const Schedule = require('../models/Schedule');
const Log = require('../models/Log');

const login = async (req, res) => {
  try {
    const { email } = req;
    const { password } = req.body;

    const user = await modelUser.findOne({ email }).select('+password').lean().exec();
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const accessToken = JWT.sign(
      { id: user._id },
      process.env.accessTokenSecret,
      { expiresIn: '1h' }
    );
    const refreshToken = JWT.sign(
      { id: user._id },
      process.env.refreshTokenSecret,
      { expiresIn: '7d' }
    );

    await modelUser.updateOne({ _id: user._id }, { refreshToken });

    const userID = user._id;

    // 🔹 chỉ lấy danh sách tủ, KHÔNG lấy relay/schedule/sensor ở đây
    const cabinets = await Cabinet.find({ userID }).sort({ createdAt: 1 }).lean();

    const { password: _, ...userProfile } = user;

    return res.status(200).json({
      message: 'Login successful!',
      accessToken,
      refreshToken,
      profile: userProfile,
      cabinets,          // 🔹 app dùng cái này để hiển thị list tủ
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// const login = async (req, res) => {
//     try {
//         const { email } = req;
//         const { password } = req.body;

//         const user = await modelUser.findOne({ email }).select('+password').lean().exec();
//         if (!user) {
//             return res.status(401).json({ error: 'Invalid username or password' });
//         }

//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(401).json({ error: 'Invalid username or password' });
//         }

//         const accessToken = JWT.sign({ id: user._id }, process.env.accessTokenSecret, { expiresIn: '1h' });
//         const refreshToken = JWT.sign({ id: user._id }, process.env.refreshTokenSecret, { expiresIn: '7d' });

//         await modelUser.updateOne({ _id: user._id }, { refreshToken });

//         const dayOfWeek = new Date().getDay();
//         const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
//         const day = daysOfWeek[dayOfWeek];

//         const userID = user._id;
//         const cabinets = Cabinet.find({userID}).lean();
//         const [relays, relays_home, latestTemp, latestHumi, latestLocation, schedules, schedules_home] = await Promise.all([
//             Relay.find({ userID }).lean(),
//             Relay.find({ userID, relay_home: true }).lean(),
//             TemperatureSensors.findOne({ userID }).sort({ Date: -1 }).select('data').lean().exec(),
//             HumiditySensors.findOne({ userID }).sort({ Date: -1 }).select('data').lean().exec(),
//             Location.findOne({ userID }).sort({ Date: -1 }).select('X Y').lean().exec(),
//             Schedule.find({ userID }).lean(),
//             Schedule.find({ userID, day: { $in: day } }).lean()
//         ]);

//         if (latestLocation) {
//             latestLocation["data"] = `${latestLocation.X}-${latestLocation.Y}`;
//             delete latestLocation.X;
//             delete latestLocation.Y;
//         }

//         const temperature = latestTemp?.data || 0.0;
//         const humidity = latestHumi?.data || 0.0;
//         const location = latestLocation?.data || "10.7736288-106.6602627";

//         const { password: _, ...userProfile } = user;

//         return res.status(200).json({
//             message: 'Login successful',
//             accessToken,
//             refreshToken,
//             temperature,
//             humidity,
//             location,
//             relays,
//             relays_home,
//             profile: userProfile,
//             schedules,
//             schedules_home,
//         });

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: 'Server error' });
//     }
// };


const register = async (req, res, next) => {
    try {
        const { fullname, username, email, password, aioUser, aioKey, phone } = req.body;
        if (!username || !fullname || !email || !password || !aioUser || !aioKey || !phone) {
            return res.status(400).json({
                message: 'Username, fullname, email, password ,phone, AIO_USERNAME and AIO_KEY are required.',
            });
        }
        // const existingUser = await modelUser.findOne({
        //     $or: [{ email }, { username }]
        // });
        const existingUser = await modelUser.findOne({
          $or: [
            { email },
            { username },
            { phone_number: phone },
            { AIO_USERNAME: aioUser },
            { AIO_KEY: aioKey },
          ]
        });

        // if (existingUser) {
        //     return res.status(400).json({
        //         error: 'Email or username already exists.',
        //     });
        // }
        if (existingUser) {
          let conflictField = '';
          if (existingUser.email === email) conflictField = 'email';
          else if (existingUser.username === username) conflictField = 'username';
          else if (existingUser.phone_number === phone) conflictField = 'phone number';
          else if (existingUser.AIO_USERNAME === aioUser) conflictField = 'AIO_USERNAME';
          else if (existingUser.AIO_KEY === aioKey) conflictField = 'AIO_KEY';

          return res.status(400).json({
            error: conflictField
              ? `${conflictField} already exists.`
              : 'Email, username, phone, AIO_USERNAME or AIO_KEY already exists.',
          });
        }
        next();
    } catch (error) {
        return res.status(500).json({
            error: 'Server error'
        });
    }
};

const logout = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await modelUser.findById(userId).exec();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.refreshToken = '';
        await user.save();
        return res.status(200).json({
            message: 'Logout successfully',
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

const get_profile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await modelUser.findById(userId).exec();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userProfile = user.toObject();
        delete userProfile.password;
        return res.status(200).json({
            message: 'Profile retrieved successfully',
            data: userProfile,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}
const edit_profile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await modelUser.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      username,
      fullname,
      email,
      newpassword,
      phone_number,
      AIO_USERNAME,
      AIO_KEY,
      webServerIp,
      currentpassword,
      // 🔹 thêm 2 field mới từ Flutter
      avatarBase64,
      coverPhotoBase64,
    } = req.body;

    // ⛔ nếu KHÔNG có text nào đổi + KHÔNG có ảnh → không cho update
    if (
      !username &&
      !fullname &&
      !email &&
      !newpassword &&
      !phone_number &&
      !AIO_USERNAME &&
      !AIO_KEY &&
      !webServerIp &&
      !avatarBase64 &&
      !coverPhotoBase64
    ) {
      return res.status(400).json({ error: 'No data provided to update.' });
    }

    if (!currentpassword) {
      return res.status(400).json({
        error: 'Current password is required.',
      });
    }

    if (newpassword && newpassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long.',
      });
    }

    const isPasswordValid = await bcrypt.compare(currentpassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid current password.',
      });
    }

    // 🔹 update các field text nếu có gửi lên
    if (username !== undefined) user.username = username;
    if (fullname !== undefined) user.fullname = fullname;
    if (email !== undefined) user.email = email;
    if (phone_number !== undefined) user.phone_number = phone_number;
    if (AIO_USERNAME !== undefined) user.AIO_USERNAME = AIO_USERNAME;
    if (AIO_KEY !== undefined) user.AIO_KEY = AIO_KEY;
    if (webServerIp !== undefined) user.webServerIp = webServerIp;

    if (newpassword) {
      const hashedPassword = await bcrypt.hash(newpassword, 10);
      user.password = hashedPassword;
    }

    // 🔹 NHẬN ẢNH DẠNG BASE64 TỪ Flutter
    if (avatarBase64) {
      user.avatar = {
        data: Buffer.from(avatarBase64, 'base64'),
        contentType: 'image/png', // hoặc gửi thêm từ client
      };
    }

    if (coverPhotoBase64) {
      user.coverPhoto = {
        data: Buffer.from(coverPhotoBase64, 'base64'),
        contentType: 'image/png',
      };
    }

    // 🔹 Nếu không đụng tới AIO thì save luôn, không cần next()
    if (!AIO_USERNAME && !AIO_KEY) {
      await user.save();
      const userProfile = user.toObject();
      delete userProfile.password;
      return res.status(200).json({
        message: 'Profile updated successfully',
        data: userProfile,
      });
    }

    // 🔹 còn nếu có đổi AIO thì dùng pipeline cũ
    req.case = 'edit_profile';
    await user.save();
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
};


// const edit_profile = async (req, res, next) => {
//     try {
//         const userId = req.user.id;
//         const user = await modelUser.findById(userId).exec();
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }
//         const { username, fullname, email, newpassword, phone_number, AIO_USERNAME, AIO_KEY, webServerIp, currentpassword } = req.body;

//         if (!username && !fullname && !email && !newpassword && !phone_number && !AIO_USERNAME && !AIO_KEY && !webServerIp) {
//             return res.status(400).json({ error: 'No data provided to update.' });
//         }

//         if (!currentpassword) {
//             return res.status(400).json({
//                 error: 'Current password  are required.',
//             });
//         }

//         if (newpassword && newpassword.length < 8) {
//             return res.status(400).json({
//                 error: 'New password must be at least 8 characters long.',
//             });
//         }

//         const isPasswordValid = await bcrypt.compare(currentpassword, user.password);
//         if (!isPasswordValid) {
//             return res.status(401).json({
//                 error: 'Invalid current password.',
//             });
//         }

//         if (username !== undefined) user.username = username;
//         if (fullname !== undefined) user.fullname = fullname;
//         if (email !== undefined) user.email = email;
//         if (phone_number !== undefined) user.phone_number = phone_number;
//         if (AIO_USERNAME !== undefined) user.AIO_USERNAME = AIO_USERNAME;
//         if (AIO_KEY !== undefined) user.AIO_KEY = AIO_KEY;
//         if (webServerIp !== undefined) user.webServerIp = webServerIp;

//         if (newpassword) {
//             const hashedPassword = await bcrypt.hash(newpassword, 10);
//             user.password = hashedPassword;
//         }

//         if (req.files) {
//             if (req.files['avatar']) {
//                 user.avatar = {
//                     data: req.files['avatar'][0].buffer,
//                     contentType: req.files['avatar'][0].mimetype
//                 };
//             }
//             if (req.files['coverPhoto']) {
//                 user.coverPhoto = {
//                     data: req.files['coverPhoto'][0].buffer,
//                     contentType: req.files['coverPhoto'][0].mimetype
//                 };
//             }
//         }
//         if (!AIO_USERNAME && !AIO_KEY) {
//             await user.save();
//             const userProfile = user.toObject();
//             delete userProfile.password;
//             return res.status(200).json({
//                 message: 'Profile updated successfully',
//                 data: userProfile,
//             });
//         }
//         req.case = 'edit_profile';
//         next();
//     } catch (error) {
//         return res.status(500).json({ error: 'Server error' });
//     }
// };


const change_password = async (req, res) => {
    try {
        const { password, newpassword } = req.body;
        const userId = req.user.id;
        const user = await modelUser.findById(userId).exec();
        if (!password || !newpassword) {
            return res.status(400).json({
                error: 'Current password and new password are required.',
            });
        }

        if (!user) {
            return res.status(404).json({
                error: 'User not found.',
            });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid current password.',
            });
        }
        const hashedPassword = await bcrypt.hash(newpassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            message: 'Password changed successfully.',
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

const forgot_password = async (req, res) => {
    try {
        const { email } = req;
        const { newPassword } = req.body;
        const user = await modelUser.findOne({ email });
        if (!user) {
            return res.status(404).json({
                error: 'User not found.',
            });
        }
        if (newPassword && newPassword.length < 8) {
            return res.status(400).json({
                error: 'New password must be at least 8 characters long.',
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        return res.status(200).json({
            message: 'Password changed successfully.',
        });

    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}

const delete_profile = async (req, res) => {
    try {
        const userId = req.user.id;
        await Promise.all([
            modelUser.findByIdAndDelete(userId),
            TemperatureSensors.deleteMany({ userID: userId }),
            HumiditySensors.deleteMany({ userID: userId }),
            Location.deleteMany({ userID: userId }),
            Relay.deleteMany({ userID: userId }),
            Schedule.deleteMany({ userID: userId }),
            Log.deleteMany({ userID: userId }),
            Cabinet.deleteMany({ userID: userId }),
        ]);
        return res.status(200).json({ message: 'User profile and related data deleted successfully.' });
    }
    catch (error) {
        return res.status(500).json({
            error: 'Server error',
        });
    }
}


module.exports = { login, register, logout, get_profile, edit_profile, delete_profile, change_password, forgot_password };
