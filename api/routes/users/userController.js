const { fetchUserTokensFromRefreshToken } = require('../../spotify/spotifyService');
const User = require('./userModel');

exports.createUser = async ({ email, password, firstName, lastName }) => {
  try {
    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
    });
    const user = await newUser.save();
    return user;
  } catch (ex) {
    throw ex;
  }
};

exports.findUserByEmail = async (email) => {
  try {
    const user = await User.findOne({ email });
    return user;
  } catch (ex) {
    throw ex;
  }
}

exports.findUserByID = async (id) => {
  try {
    const user = await User.findById(id);
    return {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      spotifyEnabled: (user.spotifyAccessToken ? true : false)
    };
  } catch (ex) {
    throw ex;
  }
};

function saveSpotifyAccessTokens(user, accessToken, refreshToken, expiresIn) {
  user.spotifyAccessToken = accessToken;
  user.spotifyRefreshToken = refreshToken;
  user.spotifyAccessTokenExpiresAfter = new Date(Date.now() + expiresIn * 1000);
  return user.save();
}

exports.saveSpotifyAccessTokensByID = async (id, accessToken, refreshToken, expiresIn) => {
  const user = await User.findById(id);
  return saveSpotifyAccessTokens(user, accessToken, refreshToken, expiresIn);
}

async function getOrRefreshSpotifyAccessToken(user) {
  if (
    user.spotifyAccessToken
    && user.spotifyAccessTokenExpiresAfter > new Date()
  ) {
    return user.spotifyAccessToken;
  }

  // Refresh the access token
  const {
    accessToken,
    refreshToken,
    expiresIn } = await fetchUserTokensFromRefreshToken(user.spotifyRefreshToken);

  await saveSpotifyAccessTokens(user, accessToken, refreshToken, expiresIn);

  return user.spotifyAccessToken;
}

exports.getSpotifyAccessTokenByID = async (id) => {
  return await getOrRefreshSpotifyAccessToken(
    await User.findById(id)
  );
}
