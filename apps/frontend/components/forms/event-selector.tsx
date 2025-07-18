import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { ElectionEvent } from '@mtes/types';
import { WithId, ObjectId } from 'mongodb';
import { Avatar, ListItemAvatar, ListItemButton, ListItemText, List } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import HomeIcon from '@mui/icons-material/HomeRounded';
import EventIcon from '@mui/icons-material/EventOutlined';
import { stringifyTwoDates } from '../../lib/utils/dayjs';
import { getBackgroundColor } from '../../lib/utils/theme';

interface EventSelectorProps {
  events: Array<WithId<ElectionEvent>>;
  onChange: (eventId: string | ObjectId) => void;
}

const EventSelector: React.FC<EventSelectorProps> = ({ events, onChange }) => {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.name.localeCompare(b.name)),
    [events]
  );

  return (
    <List>
      {sortedEvents.map(event => {
        return (
          <React.Fragment key={String(event._id)}>
            <ListItemButton
              onClick={() => onChange(event._id)}
              sx={{ borderRadius: 2 }}
              component="a"
              dense
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    color: '#a7ab99',
                    backgroundColor: getBackgroundColor('#a7ab99', 'light')
                  }}
                >
                  <EventIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={event.name} />
            </ListItemButton>
          </React.Fragment>
        );
      })}
    </List>
  );
};

export default EventSelector;
