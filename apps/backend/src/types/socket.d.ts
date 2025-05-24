import { Socket } from 'socket.io';
// ObjectId can be imported if you choose to store eventId as ObjectId on the socket
// import { ObjectId } from 'mongodb'; 

export interface AuthenticatedSocket extends Socket {
  eventId?: string; 
  // If you store it as ObjectId:
  // eventIdObjectId?: ObjectId; 
  userId?: string; // Assuming you might also attach userId from a previous auth middleware
}
