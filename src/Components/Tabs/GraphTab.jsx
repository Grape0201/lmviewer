import React, { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, ReferenceLine } from 'recharts';
import { styled } from '@mui/material/styles';
import { ITEMS } from '../../lm/constants';

const useWindowDimensions = () => {
  const getWindowDimensions = () => {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height,
    };
  };

  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  useEffect(() => {
    const onResize = () => {
      setWindowDimensions(getWindowDimensions());
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return windowDimensions;
};

function boxname(gift_source, gift_rank) {
  if (gift_source === 0) {
    switch (gift_rank) {
      case 1:
        return 'common';
      case 2:
        return 'uncommon';
      case 3:
        return 'rare';
      case 4:
        return 'epic';
      case 5:
        return 'legendary';
      default:
        return '';
    }
  } else if (gift_source === 1) {
    switch (gift_rank) {
      case 1:
        return 'white';
      case 2:
        return 'green';
      case 3:
        return 'blue';
      case 4:
        return 'purple';
      case 5:
        return 'gold';
      default:
        return '';
    }
  }
  return '';
}

function SummaryBarChart({ data, quota }) {
  const { width } = useWindowDimensions();
  if (data.length === 0) {
    return <></>;
  }
  return (
    <BarChart width={width * 0.9} height={1200} data={data} layout="vertical">
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis dataKey="player" type="category" tickSize={6} tick={{ fontSize: 8 }} interval={0} width={70} />
      <Tooltip />
      <Legend />
      <Bar dataKey="common" stackId="all" fill="#000000" />
      <Bar dataKey="uncommon" stackId="all" fill="#008000" />
      <Bar dataKey="rare" stackId="all" fill="#0000ff" />
      <Bar dataKey="epic" stackId="all" fill="#800080" />
      <Bar dataKey="legendary" stackId="all" fill="#ffd700" />
      <ReferenceLine x={quota} stroke="red" ifOverflow="extendDomain" strokeWidth={2} />
    </BarChart>
  );
}

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(2),
  margin: theme.spacing(2),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

function Popups({ logs, timefrom, timeto, mode, boxname2point }) {
  let unixtimefrom = Math.floor(timefrom.getTime() / 1000);
  let unixtimeto = Math.floor(timeto.getTime() / 1000);
  const gifts = logs.filter((x) => x.code === '2b0b12' && unixtimefrom < x.timestamp && x.timestamp < unixtimeto).map((x) => x.data);

  const playerNames = Array.from(
    new Set(
      logs
        .filter((x) => x.code == '060b00')
        .map((x) => x.data)
        .flat()
        .map((x) => x.playerName)
    )
  );
  playerNames.sort();

  const summaries = playerNames.map((pname, i) => {
    let summary = {
      id: i + 1,
      player: pname.replaceAll(' ', '_'),
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      white: 0,
      green: 0,
      blue: 0,
      purple: 0,
      gold: 0,
    };
    gifts.forEach((g) => {
      if (g.playerName === pname) {
        const box = ITEMS[g.itemId];
        const key = boxname(box[4], box[3]);
        if (key !== '') {
          if (mode === 'point') {
            summary[key] += boxname2point[key];
          } else if (mode === 'count') {
            summary[key] += 1;
          }
        }
      }
    });
    return summary;
  });
  const total_boxs = gifts.length;
  const hunts = [
    gifts.filter((g) => g.gift_rank === 1 && g.gift_source === 0).length,
    gifts.filter((g) => g.gift_rank === 2 && g.gift_source === 0).length,
    gifts.filter((g) => g.gift_rank === 3 && g.gift_source === 0).length,
    gifts.filter((g) => g.gift_rank === 4 && g.gift_source === 0).length,
    gifts.filter((g) => g.gift_rank === 5 && g.gift_source === 0).length,
  ];
  const packs = [
    gifts.filter((g) => g.gift_rank === 1 && g.gift_source === 1).length,
    gifts.filter((g) => g.gift_rank === 2 && g.gift_source === 1).length,
    gifts.filter((g) => g.gift_rank === 3 && g.gift_source === 1).length,
    gifts.filter((g) => g.gift_rank === 4 && g.gift_source === 1).length,
    gifts.filter((g) => g.gift_rank === 5 && g.gift_source === 1).length,
  ];

  return (
    <>
      <Item>
        参加者{playerNames.length}名 合計{total_boxs}箱<br />
        コモン{hunts[0]} アンコ{hunts[1]} レア{hunts[2]} エピ{hunts[3]} レジェ{hunts[4]}
        <br />
        ホワイト{packs[0]} グリーン{packs[1]} ブルー{packs[2]} パープル{packs[3]} ゴールド{packs[4]}
        <br />
      </Item>
      <SummaryBarChart data={summaries} quota={boxname2point['quota']} />
    </>
  );
}

export default function GraphTab({ logs }) {
  let yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let tommorow = new Date();
  tommorow.setDate(tommorow.getDate() + 1);
  const [timefrom, setTimefrom] = useState(yesterday);
  const [timeto, setTimeto] = useState(tommorow);
  const [boxname2point, setBoxname2point] = useState({
    // 'white': 1,
    // 'green': 6,
    // 'blue': 6*3,
    // 'purple': 6*8,
    // 'gold': 6*15,
    common: 1,
    uncommon: 6,
    rare: 6 * 3,
    epic: 6 * 8,
    legendary: 6 * 15,
    quota: 20,
  });

  const popup = <Popups logs={logs} timefrom={timefrom} timeto={timeto} mode={'point'} boxname2point={boxname2point} />;

  const point_settings = Object.entries(boxname2point).map(([boxname, point]) => {
    return (
      <Grid item xs={6} md={2} key={`input-boxname2point-${boxname}`}>
        <TextField
          id={`input-boxname2point-${boxname}`}
          label={boxname}
          defaultValue={point}
          variant="outlined"
          type="number"
          size="small"
          onChange={(e) => {
            setBoxname2point({
              ...boxname2point,
              [boxname]: parseInt(e.target.value),
            });
          }}
        />
      </Grid>
    );
  });
  return (
    <>
      <Item>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <DateTimePicker
                renderInput={(props) => <TextField {...props} />}
                label="この時間から"
                value={timefrom}
                onChange={(newValue) => {
                  setTimefrom(newValue);
                }}
                padding={'5px'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DateTimePicker
                renderInput={(props) => <TextField {...props} />}
                label="この時間まで"
                value={timeto}
                onChange={(newValue) => {
                  setTimeto(newValue);
                }}
              />
            </Grid>
            {point_settings}
          </Grid>
        </LocalizationProvider>
      </Item>
      {popup}
    </>
  );
}
