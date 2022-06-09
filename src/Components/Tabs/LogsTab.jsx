import React from 'react';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Avatar from '@mui/material/Avatar';
import { red, common } from '@mui/material/colors';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import DoNotDisturbAltIcon from '@mui/icons-material/DoNotDisturbAlt';
import PersonIcon from '@mui/icons-material/Person';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { ITEMS } from '../../lm/constants';

// for icons, see:
// https://mui.com/material-ui/material-icons/

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const LogsTab = ({ logs }) => {
  const cardLength = Math.min(10, logs.length);
  const cards = [...Array(cardLength)].map((_, i) => {
    // get latest logs
    const x = logs[logs.length - 1 - i];
    const d = x.data;

    // elements of card
    let msg = `[0x${x.code}] `;
    let helpText = `${new Date(x.timestamp * 1000)}`;
    let icon = <DoNotDisturbAltIcon />;
    let color = common[500];

    // branch by code
    if (x.code === 'bb0b00') {
      icon = <RecordVoiceOverIcon />;
      msg += `chat`;
      helpText = `[${d.guildTag}]${d.playerName}: ${d.comment}`;
      color = red[500];
    } else if (x.code === '060b00') {
      icon = <PersonIcon />;
      msg += `might ranking(${d.length} members)`;
      helpText = [...Array(Math.min(3, d.length))].map((_, i) => `${d[i].playerName}@R${d[i].guildRank}`).join(', ') + '...';
      color = red[500];
    } else if (x.code === '2b0b12') {
      icon = <CardGiftcardIcon />;
      msg += `Loot popup`;
      helpText = `${ITEMS[d.itemId][0]} from ${d.playerName}`;
      color = red[500];
    }

    return (
      <Card key={makeid(10)} sx={{ marginBottom: 1 }}>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: color }} aria-label="recipe">
              {icon}
            </Avatar>
          }
          title={msg}
          subheader={helpText}
        />
      </Card>
    );
  });
  return <Container>{cards}</Container>;
};

export default LogsTab;
