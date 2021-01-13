import React, { useState, useEffect } from 'react'
import Container from '@material-ui/core/Container'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles'
import { useHistory, useRouteMatch } from 'react-router-dom';

const useStyles = makeStyles(theme => ({
  content: {
    padding: theme.spacing(8, 0, 6),
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: 200,
  },
  buttonField: {
    marginTop: theme.spacing(1),
  },
}))

export default function NoteForm({ user }) {
  const classes = useStyles();
  const [note, setNote] = useState('');
  const [error, setError] = useState(undefined);

  async function getNoteById(id) {
    try {
      const response = await fetch(`/api/notes/${id}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message);
      }

      setNote(json.data.text);
      setListeningTo(json.data.listeningTo);
    } catch (err) {
      console.log(err);
    }
  }

  async function connectSpotify() {
    try {
      const response = await fetch(`/api/users/connect-spotify`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.message);
      }

      window.location = json.redirectTo;
    } catch (err) {
      console.log(err);
    }
  }

  const match = useRouteMatch();

  useEffect(() => {
    if (match.params.id) {
      getNoteById(match.params.id);
    }
  }, [match.params.id]);

  const history = useHistory();

  async function handleSubmit(e) {
    try {
      e.preventDefault();
      const updateId = match.params.id
      const url = updateId ? `/api/notes/${updateId}` : '/api/notes';
      const method = updateId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: note, listeningTo: listeningTo }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message);
      }

      history.push('/');
    } catch (err) {
      setError(err.message);
    }
  }

  const [listeningTo, setListeningTo] = useState(false);

  useEffect(() => {
    async function fetchListeningTo() {
      try {
        const response = await fetch('/api/users/listening-to');
        const json = await response.json();

        if (json.listeningTo) {
          setListeningTo(json.listeningTo);
        }
      } catch (err) {
        setError(err.message);
      }
    }

    // only call the API if the user has connected spotify
    // AND we're not editing an old note
    if (user.spotifyEnabled && !match.params.id) {
      fetchListeningTo();
    }
  }, [user, match.params.id]);

  return (
    <Container className={classes.content} maxWidth='md'>
      <form onSubmit={handleSubmit}>
        <div>
          {error && <Typography color="error">{error}</Typography>}
          <Typography variant='h4' align='left' color='textPrimary'>
            Add a Note
          </Typography>
        </div>
        <div>
          <TextField
            id="standard-multiline-flexible"
            label="Note text"
            multiline
            rowsMax="2"
            className={classes.textField}
            margin="normal"
            value={note}
            onChange={(e) => { setNote(e.target.value); }}
          />
        </div>
        <div>
          {user.spotifyEnabled
            ? (listeningTo === false ? '...' : <TextField
              id="outlined-full-width"
              variant="outlined"
              fullWidth
              label="Listening To"
              value={listeningTo}
              margin="normal"
              onChange={(e) => { setListeningTo(e.target.value); }}
            />)
            : (
              <Button variant="outlined" onClick={connectSpotify}>
                Connect Spotify to Add Listening To
              </Button>
            )}
        </div>
        <Button
          color="primary"
          type="submit"
        >
          Add Note
        </Button>
      </form>
    </Container>
  )
}