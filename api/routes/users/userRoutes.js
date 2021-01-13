const express = require('express');
const { createUser, findUserByEmail, findUserByID, saveSpotifyAccessTokensByID, getSpotifyAccessTokenByID } = require('./userController');
const { createToken } = require('../../tokens/tokenService');
const { verifyToken } = require('../../middleware/verifyToken');
const { spotifyAuthorizationUrl, fetchUserTokensFromAuthCode, fetchListeningTo } = require("../../spotify/spotifyService");

const router = express.Router();

router.route('/')
  .post(async (req, res) => {
    const { email, password, firstName, lastName } = req.body;
    if (!email || email === "") {
      res.status(400).json({ message: 'email must be provided' });
      return;
    }

    if (!password || password === "") {
      res.status(400).json({ message: 'password must be provided' });
      return;
    }

    if (!firstName || firstName === "") {
      res.status(400).json({ message: 'firstName must be provided' });
      return
    }

    if (!lastName || lastName === "") {
      res.status(400).json({ message: 'lastName must be provided' });
      return
    }


    try {
      const foundUser = await findUserByEmail(email);
      if (foundUser) {
        res.status(400).json({ message: `email '${email}' already exists'` });
        return;
      }

      const user = await createUser({ email, password, firstName, lastName });
      res.json({ data: { id: user._id } });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'internal server error' });
    }
  });

router.route('/login')
  .post(async (req, res) => {
    const { email, password } = req.body;
    if (!email || email === "") {
      res.status(400).json({ message: 'email must be provided' });
      return;
    }

    if (!password || password === "") {
      res.status(400).json({ message: 'password must be provided' });
      return;
    }

    try {
      // does the user exist?
      const user = await findUserByEmail(email);
      if (!user) {
        res.status(400).json({ message: 'password and email do not match' });
        return;
      }

      // do the password match?
      const isMatch = await user.comparePasswords(password);
      if (!isMatch) {
        res.status(400).json({ message: 'password and email do not match' });
        return;
      }

      const token = createToken({ id: user._id });
      res.cookie('token', token);
      res.status(200).json({});
    } catch (ex) {
      console.log(ex);
      res.status(500).json({ message: 'internal server error' });
    }
  });

router
  .use(verifyToken)
  .route('/me')
  .get(async (req, res) => {
    try {
      const user = await findUserByID(req.user.id);
      res.json({ data: user });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'internal server error' });
    }
  });

function getSpotifyCallbackUrlFromReq(req) {
  // Simplify the workflow by sending the user back to the API directly
  // In a more advanced implementation you might send the user back to the
  // front-end react app and then make an AJAX request to this endpoint
  return `http://localhost:8080${req.baseUrl}/spotify-auth-callback`;
}

router
  .use(verifyToken)
  .route('/connect-spotify')
  .get(async (req, res) => {
    try {
      // Generate an authorization URL and provide it in the response
      // The front-end will use it to redirect the user grant authorization
      res.json({
        redirectTo: spotifyAuthorizationUrl(
          getSpotifyCallbackUrlFromReq(req),
          'user-read-recently-played'
        )
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'internal server error' });
    }
  });

router
  .use(verifyToken)
  .route('/spotify-auth-callback')
  .get(async (req, res) => {
    if (!req.query.code) {
      /* 
        Shows a simple text error.
        In a more advanced implementation the front-end would call this end-point via AJAX and this error could be returned and handled in the front-end.
      */
      res.status(500).text(`User didn't grant access to Spotify`);
      return;
    }
    try {
      // Exchange the authorization code for user tokens
      const { accessToken, refreshToken, expiresIn } = await fetchUserTokensFromAuthCode(
        req.query.code,
        getSpotifyCallbackUrlFromReq(req)
      );

      await saveSpotifyAccessTokensByID(
        req.user.id,
        accessToken,
        refreshToken,
        expiresIn
      );

      // Send the user back to the react app
      res.redirect('http://localhost:3000');
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'internal server error' });
    }
  });

router
  .use(verifyToken)
  .route('/listening-to')
  .get(async (req, res) => {
    try {
      const accessToken = await getSpotifyAccessTokenByID(req.user.id);
      res.json({
        listeningTo: await fetchListeningTo(accessToken)
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'internal server error' });
    }
  });

module.exports = router;
