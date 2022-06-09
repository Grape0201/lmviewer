import { Container, Snackbar } from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useStream } from 'react-fetch-streams';
import parsePcap from '../lm/packetHandler';
import MainTabs from './MainTabs';
import sampleLog from './sampleLog';

const fetchParams = { mode: 'cors' };

function Logger() {
  const [logs, setLogs] = useState(sampleLog);
  // パケットが分断されてしまっている時のためのバッファ
  const [pcapExtraData, setPcapExtraData] = useState(null);
  // code前のデータ長には足りなかった時のためのバッファ
  const [lmExtraBuffer, setLmExtraBuffer] = useState(null);
  //
  const [timestamp, setTimestamp] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [open, setOpen] = useState(false);

  // 接続先のURL
  const [url, setUrl] = useState('');
  // const url = 'http://192.168.0.50:8080';
  const onNext = useCallback(
    async (res) => {
      const now = Date.now();
      let d = [];
      const reader = res.body.getReader();
      function readChunk({ done, value }) {
        if (done) {
          return;
        }
        d.push(value);
        // read next chunk
        reader.read().then(readChunk);
      }
      // read first chunk
      reader
        .read()
        .then(readChunk)
        .then(() => {
          if (now - timestamp > 10) {
            setLmExtraBuffer(null);
            setPcapExtraData(null);
          }
          console.log(now - timestamp, lmExtraBuffer);
          // concat all chunk
          let _d = new Uint8Array(d.map((v) => v.length).reduce((s, e) => s + e, 0));
          let index = 0;
          d.forEach((v) => {
            _d.set(v, index);
            index += v.length;
          });
          let result;
          if (pcapExtraData) {
            let __d = new Uint8Array(pcapExtraData.length + _d.length);
            __d.set(pcapExtraData);
            __d.set(_d, pcapExtraData.length);
            result = parsePcap(__d, lmExtraBuffer);
          } else {
            result = parsePcap(_d, lmExtraBuffer);
          }
          setLogs([...logs, ...result.logs]);
          setLmExtraBuffer(result.lmExtraBuffer);
          if (result.index > 0) {
            setPcapExtraData(d.slice(result.index));
          } else {
            setPcapExtraData(null);
          }
        });
      setTimestamp(now);
      setIsConnected(true);
    },
    [logs, setLogs, setPcapExtraData, lmExtraBuffer, setLmExtraBuffer, timestamp, setTimestamp, setIsConnected]
  );
  const onError = useCallback(
    async (res) => {
      console.error(res);
      setOpen(url !== '');
      setIsConnected(false);
    },
    [setOpen, setIsConnected]
  );
  useStream('http://' + url, { onNext, onError, fetchParams });

  return (
    <Container centered>
      <MainTabs logs={logs} url={url} setURL={setUrl} isConnected={isConnected} />
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={(e, r) => {
          if (r === 'clickaway') {
            return;
          }
          setOpen(false);
        }}
        message="接続失敗"
      />
    </Container>
  );
}

export default Logger;
