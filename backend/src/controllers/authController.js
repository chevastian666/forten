const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, config.jwt.secret, { 
    expiresIn: config.jwt.expiresIn 
  });
  
  const refreshToken = jwt.sign({ id: userId }, config.jwt.refreshSecret, { 
    expiresIn: config.jwt.refreshExpiresIn 
  });
  
  return { accessToken, refreshToken };
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email, isActive: true } });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { accessToken, refreshToken } = generateTokens(user.id);
    
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      user: user.toJSON(),
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const user = await User.findOne({ 
      where: { id: decoded.id, refreshToken, isActive: true } 
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const tokens = generateTokens(user.id);
    user.refreshToken = tokens.refreshToken;
    await user.save();
    
    res.json(tokens);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    req.user.refreshToken = null;
    await req.user.save();
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

const profile = (req, res) => {
  res.json({ user: req.user.toJSON() });
};

module.exports = {
  login,
  refreshToken,
  logout,
  profile
};