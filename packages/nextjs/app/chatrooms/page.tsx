"use client"

import { useEffect, useState, useCallback } from "react";
import { NextPage } from "next";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient, useReadContract, useWriteContract, useTransaction } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth/useScaffoldWatchContractEvent";
import { useTransactor } from "~~/hooks/scaffold-eth";

const contractName = "DecentralizedChat";
const contractAddress = deployedContracts[11155111]?.DecentralizedChat?.address as `0x${string}`;
const contractAbi = deployedContracts[11155111]?.DecentralizedChat?.abi;

interface Room {
  name: string;
  membersCount: number;
  messagesCount: number;
  messages: {
    sender: string;
    content: string;
    timestamp: number;
  }[];
}

const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const publicClient = usePublicClient();

  const { data: roomsCount } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getRoomCount",
  });

  const fetchRooms = useCallback(async () => {
    if (!roomsCount || !publicClient) return;

    const fetchedRooms: Room[] = [];

    for (let i = 0; i < Number(roomsCount); i++) {
      const roomName = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "getRoom",
        args: [BigInt(i)],
      });

      const members = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "getRoomMembers",
        args: [BigInt(i)],
      });

      const messagesCount = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "getRoomMessagesCount",
        args: [BigInt(i)],
      });

      const messages = [];
      for (let j = 0; j < Number(messagesCount); j++) {
        const message = await publicClient.readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: "getRoomMessage",
          args: [BigInt(i), BigInt(j)],
        });

        if (message) {
          const [sender, content, timestamp] = message as [string, string, bigint];
          messages.push({
            sender,
            content,
            timestamp: Number(timestamp),
          });
        }
      }

      fetchedRooms.push({
        name: roomName as string,
        membersCount: (members as string[]).length,
        messagesCount: Number(messagesCount),
        messages,
      });
    }

    setRooms(fetchedRooms);
    setLoading(false);
  }, [roomsCount, publicClient]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return { rooms, loading, fetchRooms };
};

const Chatrooms: NextPage = () => {
  const { rooms, loading, fetchRooms } = useRooms();
  const { address } = useAccount();
  const router = useRouter();
  const writeTx = useTransactor();
  const publicClient = usePublicClient();

  const [currentPage, setCurrentPage] = useState(1);
  const roomsPerPage = 5;

  const { writeContractAsync: joinRoomAsync } = useWriteContract();
  const { writeContractAsync: createRoomAsync } = useWriteContract();
  const [txResponse, setTxResponse] = useState<`0x${string}` | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);

  const { isSuccess: isTxSuccess } = useTransaction({
    hash: txResponse,
  });

  useEffect(() => {
    if (isTxSuccess) {
      fetchRooms();
    }
  }, [isTxSuccess, fetchRooms]);

  const handleCreateRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const roomNameInput = (e.target as HTMLFormElement).elements.namedItem("roomName") as HTMLInputElement;
    const roomName = roomNameInput ? roomNameInput.value : "";

    try {
      setIsCreating(true);
      // Close the modal immediately after form submission
      (document.getElementById('my_modal_1') as HTMLDialogElement)?.close();

      const createRoomTx = async () =>
        createRoomAsync({
          address: contractAddress,
          abi: contractAbi,
          functionName: "createRoom",
          args: [roomName],
        });

      const txResponse = await writeTx(createRoomTx, { blockConfirmations: 1 });

      if (typeof txResponse !== 'string') {
        throw new Error("Failed to create room. Invalid transaction response.");
      }

      setTxResponse(txResponse);
      await fetchRooms();
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setIsCreating(false);
    }
  };

  useScaffoldWatchContractEvent({
    contractName,
    eventName: "RoomCreated",
    onLogs: useCallback(() => {
      fetchRooms();
    }, [fetchRooms]),
  });

  useScaffoldWatchContractEvent({
    contractName,
    eventName: "JoinedRoom",
    onLogs: useCallback(() => {
      fetchRooms();
    }, [fetchRooms]),
  });

  const joinAndEnterRoom = async (roomId: number) => {
    if (!address || !publicClient) return;

    try {
      const isUserInRoom = await publicClient.readContract({
        address: contractAddress,
        abi: contractAbi,
        functionName: "isMember",
        args: [BigInt(roomId), address],
      });

      if (!isUserInRoom) {
        const joinRoomTx = async () =>
          joinRoomAsync({
            address: contractAddress,
            abi: contractAbi,
            functionName: "joinRoom",
            args: [BigInt(roomId)],
          });

        await writeTx(joinRoomTx);
      }

      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("Error joining or entering room:", error);
    }
  };

  const indexOfLastRoom = currentPage * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRooms = rooms.slice(indexOfFirstRoom, indexOfLastRoom);
  const totalPages = Math.ceil(rooms.length / roomsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="flex-grow items-center bg-base-300 w-full mt-16 px-8 py-12">
        <div>
          <button className="btn" onClick={() => (document.getElementById('my_modal_1') as HTMLDialogElement)?.showModal()}>Create Chatroom</button>
          <dialog id="my_modal_1" className="modal">
            <div className="modal-box">
              <div>
                <h3 className="font-bold text-lg">Create Room</h3>
                <form onSubmit={handleCreateRoom}>
                  <input
                    type="text"
                    placeholder="Enter Room Name"
                    name="roomName"
                    className="input input-bordered w-full max-w-xs pb-2 m-2"
                  />
                  <button className="btn" type="submit" disabled={isCreating}>Create Room</button>
                </form>
              </div>
            </div>
          </dialog>
        </div>

        <div>
          <h1 className="font-bold text-lg">Chat Rooms</h1>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Members Count</th>
                  <th>Messages Count</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {currentRooms.map((room, index) => (
                  <tr key={index}>
                    <td>{room.name}</td>
                    <td>{room.membersCount}</td>
                    <td>{room.messagesCount}</td>
                    <td>
                      <a
                        onClick={() => address && joinAndEnterRoom(indexOfFirstRoom + index)}
                        style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                      >
                        Enter Chatroom
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <button className="btn" onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                Previous
              </button>
              <span className="mx-2">Page {currentPage} of {totalPages}</span>
              <button className="btn" onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatrooms;