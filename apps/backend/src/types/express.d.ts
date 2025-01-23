import { WithId } from 'mongodb';
import { ElectionEvent, User } from '@mtes/types';

declare global {
  namespace Express {
    interface Request {
      user?: WithId<User>;
      event?: WithId<ElectionEvent>;
    }
  }
}
