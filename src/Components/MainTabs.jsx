import React from 'react';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import LogsTab from './Tabs/LogsTab';
import ControlTab from './Tabs/ControlTab';
import GraphTab from './Tabs/GraphTab';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function MainTabs({ logs, url, setURL, isConnected }) {
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
        <Tabs value={value} onChange={handleChange} aria-label="basic tabs example" centered>
          <Tab label="control" {...a11yProps(0)} />
          <Tab label="summary" {...a11yProps(1)} />
          <Tab label="logs" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <ControlTab url={url} setURL={setURL} isConnected={isConnected} />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <GraphTab logs={logs} />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <LogsTab logs={logs} />
      </TabPanel>
    </Box>
  );
}
