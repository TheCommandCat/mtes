import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import { ElectionEvent } from '@mtes/types';
import { WithId, ObjectId } from 'mongodb';
import { Avatar, ListItemAvatar, ListItemButton, ListItemText, List } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import EventIcon from '@mui/icons-material/EventOutlined';
import { stringifyTwoDates } from '../../lib/utils/dayjs';
import { getBackgroundColor } from '../../lib/utils/theme';

interface EventSelectorProps {
  events: Array<WithId<ElectionEvent>>;
  onChange: (eventId: string | ObjectId) => void;
  getEventDisabled?: (event: WithId<ElectionEvent>) => boolean;
}

const EventSelector: React.FC<EventSelectorProps> = ({
  events,
  onChange,
  getEventDisabled,
}) => {

  const sortedEvents = useMemo(
    () =>
      events.sort((a, b) => {
        const diffA = dayjs().diff(dayjs(a.startDate), 'days', true);
        const diffB = dayjs().diff(dayjs(b.startDate), 'days', true);

        if (diffB > 1 && diffA <= 1) return -1;
        if (diffA > 1 && diffB <= 1) return 1;
        if (diffA > 1 && diffB > 1) return diffA - diffB;
        return diffB - diffA;
      }),
    [events]
  );

  return (
    <List>
      {sortedEvents.map(event => {
        const disabled = getEventDisabled?.(event);

        return (
          <ListItemButton
            key={String(event._id)}
            onClick={() => onChange(event._id)}
            disabled={disabled}
            sx={{ borderRadius: 2 }}
            component="a"
            dense
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  color: event.color ?? '#a7ab99',
                  backgroundColor: getBackgroundColor(event.color ?? '#a7ab99', 'light')
                }}
              >
                <EventIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={event.name}
              secondary={stringifyTwoDates(event.startDate, event.endDate)}
            />
            {disabled && <WarningAmberRoundedIcon />}
          </ListItemButton>
        );
      })}
    </List>
  );
};

export default EventSelector;
