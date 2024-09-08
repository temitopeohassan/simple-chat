"use client";
import React from "react";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth/useScaffoldWatchContractEvent";

const networkId = "31337";

const contractName = "DecentralizedChat";
const contractAddress = deployedContracts[31337]?.DecentralizedChat?.address;
const contractAbi = deployedContracts[31337]?.DecentralizedChat?.abi;

interface Room {
  name: string;
  members: string[];
  messages: {
    sender: string;
    content: string;
    timestamp: number;
  }[];
}

interface MessageSentEvent {
  sender: string;
  content: string;
  timestamp: number | bigint;
}

const ChatroomHeader = ({ title }: { title: string }) => (
  <div>
    <h1 className="block text-4xl font-bold">{title}</h1>
  </div>
);

const ChatroomMessage = ({ message, userAddress }: { message: { sender: string; content: string; timestamp: number }, userAddress: string | null }) => (
  <div className={`chat ${message.sender === userAddress ? "chat-end" : "chat-start"}`}>
    <div className="chat-header">
      {message.sender}
    </div>
    <div className="chat-bubble">{message.content}</div>
    <div className="chat-footer opacity-50">Delivered</div>
  </div>
);

const ChatroomMember = ({ member }: { member: string }) => <><li>{member}</li><br /></>;

const ChatroomInput = ({ sendMessage }: { sendMessage: (message: string) => void }) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    sendMessage(message);
    setMessage("");
  };

  return (
    <div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message"
        className="input input-bordered w-full max-w-xs"
      />
      <button className="btn" onClick={handleSend}>Send</button>
    </div>
  );
};

const Chatroom = ({ room, userAddress }: { room: Room | null, userAddress: string | null }) => {
  if (!room) {
    return <div>Loading...</div>;
  }
  return (
    <div className="chatroom relative h-full">
      <ChatroomHeader title={room.name} />
      <div className="messages overflow-y-auto h-full pb-16">
        {room.messages.map((message, index) => (
          <ChatroomMessage key={index} message={message} userAddress={userAddress} />
        ))}
      </div>
    </div>
  );
};

const RoomPage = () => {
  const { roomID } = useParams();
  const roomIDValue = Array.isArray(roomID) ? roomID[0] : roomID;
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { address: userAddress } = useAccount();
  const processedMessageIds = useRef<Set<string>>(new Set());

  const publicClient = usePublicClient();

  const { data: roomData, refetch: refetchRoomData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractAbi,
    functionName: 'getRoom',
    args: [BigInt(roomIDValue)],
  });

  const { data: roomMembers, refetch: refetchRoomMembers } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractAbi,
    functionName: 'getRoomMembers',
    args: [BigInt(roomIDValue)],
  });

  const { data: messagesCount, refetch: refetchMessagesCount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: contractAbi,
    functionName: 'getRoomMessagesCount',
    args: [BigInt(roomIDValue)],
  });

  const { writeContract: sendMessage, data: sendMessageData } = useWriteContract();

  const { writeContract: leaveRoomContract, data: leaveRoomData } = useWriteContract();

  const { isLoading: isSendingMessage } = useWaitForTransactionReceipt({
    hash: sendMessageData,
  });

  const { isLoading: isLeavingRoom, isSuccess: isLeaveRoomSuccess } = useWaitForTransactionReceipt({
    hash: leaveRoomData,
  });

  useEffect(() => {
    if (isLeaveRoomSuccess) {
      console.log("Transaction successful, redirecting to /chatrooms");
      router.push('/chatrooms');
    } else {
      console.log("Transaction not yet successful or not started");
    }
  }, [isLeaveRoomSuccess, router]);

  useEffect(() => {
    if (!roomIDValue || !publicClient) return;

    const fetchRoomData = async () => {
      try {
        const roomName = roomData as unknown as string;
        const members = roomMembers as unknown as string[];
        const messagesCountNum = messagesCount as unknown as number;
        const messages = [];
        for (let j = 0; j < messagesCountNum; j++) {
          const message = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: contractAbi,
            functionName: 'getRoomMessage',
            args: [BigInt(roomIDValue), BigInt(j)],
          });
          const [sender, content, timestamp] = message as [string, string, bigint];
          messages.push({
            sender,
            content,
            timestamp: Number(timestamp),
          });
        }
        setRoom({
          name: roomName,
          members,
          messages,
        });
        setLoading(false);
      } catch (error) {
        console.error("Error fetching room data:", error);
      }
    };

    fetchRoomData();
  }, [roomIDValue, publicClient, roomData, roomMembers, messagesCount]);

  useScaffoldWatchContractEvent({
    contractName,
    eventName: "MessageSent",
    onLogs: (logs: any[]) => {
      logs.forEach(log => {
        const { sender, content, timestamp, roomId } = log.args as MessageSentEvent & { roomId: bigint };
        console.log("📡 MessageSent event", sender, content, timestamp, roomId);

        if (roomId.toString() === roomIDValue) {
          const messageId = `${roomId}-${timestamp}-${sender}-${content}`;
          if (!processedMessageIds.current.has(messageId)) {
            processedMessageIds.current.add(messageId);
            setRoom(prevRoom => {
              if (!prevRoom) return prevRoom;
              return {
                ...prevRoom,
                messages: [
                  ...prevRoom.messages,
                  {
                    sender,
                    content,
                    timestamp: Number(timestamp)
                  }
                ]
              };
            });
          }
        }
      });
    }
  });

  useScaffoldWatchContractEvent({
    contractName,
    eventName: "JoinedRoom",
    onLogs: (logs: any[]) => {
      console.log("Received JoinedRoom logs:", logs);
      logs.forEach(log => {
        const { roomId, user } = log.args;
        console.log("📡 MemberJoined event", user, roomId);

        if (roomId.toString() === roomIDValue) {
          setRoom(prevRoom => {
            if (!prevRoom) return prevRoom;
            if (prevRoom.members.includes(user)) return prevRoom;
            return {
              ...prevRoom,
              members: [...prevRoom.members, user]
            };
          });
        }
      });
    }
  });

  useScaffoldWatchContractEvent({
    contractName,
    eventName: "LeftRoom",
    onLogs: (logs: any[]) => {
      console.log("Received LeftRoom logs:", logs);
      logs.forEach(log => {
        const { roomId, user } = log.args;
        console.log("📡 MemberLeft event", user, roomId);

        if (roomId.toString() === roomIDValue) {
          setRoom(prevRoom => {
            if (!prevRoom) return prevRoom;
            return {
              ...prevRoom,
              members: prevRoom.members.filter(m => m !== user)
            };
          });
        }
      });
    }
  });

  const sendMessageToContract = async (message: string) => {
    if (!roomIDValue || !userAddress) {
      console.error("Room ID or user address is missing");
      return;
    }
    try {
      sendMessage({
        address: contractAddress as `0x${string}`,
        abi: contractAbi,
        functionName: 'sendMessage',
        args: [BigInt(roomIDValue), message],
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const leaveRoom = async () => {
    if (!roomIDValue) {
      console.error("Room ID is missing");
      return;
    }
    try {
      leaveRoomContract({
        address: contractAddress as `0x${string}`,
        abi: contractAbi,
        functionName: 'leaveRoom',
        args: [BigInt(roomIDValue)],
      });
    } catch (error) {
      console.error("Error leaving room:", error);
    }
  };

  return (
    <div className="chatrooms-page">
      <div className="flex h-screen w-full bg-base-300 px-10 py-10 rounded-3xl mx-10 grid grid-cols-5 gap-4 h-screen">
        <div className="col-span-4 bg-base-100 rounded-2xl p-10 relative">
          <div className="absolute top-0 left-0 right-0 bottom-0 flex flex-col justify-between p-4">
            <div className="bg-base-100 px-5 flex-grow-9 p-2">
              <Chatroom room={room} userAddress={userAddress || null} />
            </div>
            <div className="bg-base-300 flex-grow-1 p-2 mt-4">
              <div className="bg-base-100 rounded-xl px-5 py-5 flex-grow-9 p-2">
                <ChatroomInput sendMessage={sendMessageToContract} />
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1 rounded-3xl bg-base-100 p-1">
          <button className="btn btn-outline btn-error" onClick={leaveRoom}>Leave Chatroom</button>
          <h1 className="mt-2"><span className="block text-2xl mb-2">Members In The Room</span></h1>
          <ul className="break-all">
            {room && room.members && room.members.length > 0
              ? room.members?.map((member, index) => (
                <ChatroomMember key={index} member={member} />
              ))
              : <li>No members in this room</li>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;
