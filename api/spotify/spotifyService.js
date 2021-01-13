const fetch = require("node-fetch");

const clientAuthorizationHeader = () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  return `Basic ${(
    Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64")
  )}`;
}

exports.spotifyAuthorizationUrl = (redirectUri, requestedScope = undefined) => {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: requestedScope,
  });
  return url;
}

exports.fetchUserTokensFromAuthCode = async (code, redirectUri) => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri,
  });

  console.log('Acquiring access token from auth code...');
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: clientAuthorizationHeader(),
    },
    body: `${body}`,
  });

  if (response.status !== 200) {
    console.log(await response.text());
    throw new Error("Unable to acquire access token");
  }
  const json = await response.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in
  };

}

exports.fetchUserTokensFromRefreshToken = async (refreshToken) => {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  console.log('Refreshing access token...');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: clientAuthorizationHeader()
    },
    body: `${body}`,
  });

  if (response.status !== 200) {
    console.log(await response.text());
    throw new Error('Unable to acquire access token');
  }
  const json = await response.json();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in
  };
}

exports.fetchListeningTo = async (accessToken) => {
  const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
  });

  if (response.status !== 200) {
    console.log(await response.text());
    throw new Error('Unable to acquire recently played');
  }

  const json = await response.json();
  let listeningTo = '';
  if (json.items && json.items.length) {
    const songName = json.items[0].track.name;
    const artists = json.items[0].track.artists.map((artist) => artist.name).join(', ');
    listeningTo = `${songName} by ${artists}`;
  }
  return listeningTo;
}
