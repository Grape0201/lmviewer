import React, { useState } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import SignalWifiConnectedNoInternet4Icon from '@mui/icons-material/SignalWifiConnectedNoInternet4';
import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';
import { Typography } from '@mui/material';

const pattern =
  /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5]):([1-9][0-9]{3}|[1-9][0-9]{2}|[1-9][0-9]{1})$/;
function ControlTab({ setURL, isConnected, url }) {
  const [helperText, setHelperText] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [error, setError] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(true);

  // if (ipAddress) {
  //   setHelperText(pattern.test(ipAddress) ? '' : 'invalid');
  // }

  return (
    <Grid container spacing={2} alignItems="center" justifyContent="center" direction="column">
      <Grid item xs={12}>
        <TextField
          error={error}
          variant="filled"
          label="IP Address"
          placeholder="192.168.0.50:8080"
          helperText={helperText}
          onChange={(e) => {
            setIpAddress(e.target.value);
            if (e.target.value.match(pattern)) {
              setHelperText('');
              setError(false);
              setButtonDisabled(false);
            } else {
              setHelperText('invalid');
              setError(true);
              setButtonDisabled(true);
            }
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          onClick={() => {
            console.log(ipAddress);
            setURL('');
            setURL(ipAddress);
          }}
          disabled={buttonDisabled}
          sx={{ marginRight: 1 }}
        >
          START
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            setURL('');
            setURL(ipAddress);
          }}
          disabled={isConnected || url === ''}
          sx={{ marginLeft: 1 }}
        >
          RECONNECT
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Typography>
          {isConnected ? <SignalWifiStatusbar4BarIcon /> : <SignalWifiConnectedNoInternet4Icon />}
          {url}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Button variant="contained" color="error">
          REFRESH
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Link href="https://drive.google.com/file/d/1yB-Ohtu_nhqEl3Shefuoq05Lhpa133pp/view?usp=sharing" component={Button}>
          CORS版PCAPdroidをダウンロード
        </Link>
      </Grid>
    </Grid>
  );
}

export default ControlTab;
