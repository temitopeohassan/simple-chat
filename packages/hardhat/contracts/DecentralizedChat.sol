// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract DecentralizedChat {
    struct Message {
        address sender;
        string content;
        uint256 timestamp;
    }

    struct Room {
        string name;
        address[] members;
        Message[] messages;
    }

    Room[] public rooms;

    mapping(address => uint256[]) public userRooms;

    event RoomCreated(uint256 roomId, string name, address creator);
    event JoinedRoom(uint256 roomId, address user);
    event LeftRoom(uint256 roomId, address user);
    event MessageSent(uint256 roomId, address sender, string content, uint256 timestamp);

    function createRoom(string memory name) public {
        Room storage newRoom = rooms.push();
        newRoom.name = name;
        newRoom.members.push(msg.sender);
        uint256 roomId = rooms.length - 1;
        userRooms[msg.sender].push(roomId);

        emit RoomCreated(roomId, name, msg.sender);
    }

    function joinRoom(uint256 roomId) public {
        require(roomId < rooms.length, "Room does not exist");
        Room storage room = rooms[roomId];

        // Check if the user is already a member
        for (uint256 i = 0; i < room.members.length; i++) {
            if (room.members[i] == msg.sender) {
                revert("User is already a member of the room");
            }
        }

        room.members.push(msg.sender);
        userRooms[msg.sender].push(roomId);

        emit JoinedRoom(roomId, msg.sender);
    }

    function leaveRoom(uint256 roomId) public {
        require(roomId < rooms.length, "Room does not exist");
        Room storage room = rooms[roomId];
        
        // Check if the user is a member of the room
        bool userIsMember = false;
        for (uint256 i = 0; i < room.members.length; i++) {
            if (room.members[i] == msg.sender) {
                userIsMember = true;
                break;
            }
        }
        require(userIsMember, "User is not a member of the room");

        // Remove user from room members
        for (uint256 i = 0; i < room.members.length; i++) {
            if (room.members[i] == msg.sender) {
                room.members[i] = room.members[room.members.length - 1];
                room.members.pop();
                break;
            }
        }

        // Remove room from user's rooms
        uint256[] storage userRoomList = userRooms[msg.sender];
        for (uint256 i = 0; i < userRoomList.length; i++) {
            if (userRoomList[i] == roomId) {
                userRoomList[i] = userRoomList[userRoomList.length - 1];
                userRoomList.pop();
                break;
            }
        }

        emit LeftRoom(roomId, msg.sender);
    }

    function sendMessage(uint256 roomId, string memory content) public {
        require(roomId < rooms.length, "Room does not exist");
        Room storage room = rooms[roomId];

        // Check if the user is a member of the room
        bool userIsMember = false;
        for (uint256 i = 0; i < room.members.length; i++) {
            if (room.members[i] == msg.sender) {
                userIsMember = true;
                break;
            }
        }
        require(userIsMember, "User is not a member of the room");

        room.messages.push(Message({
            sender: msg.sender,
            content: content,
            timestamp: block.timestamp
        }));

        emit MessageSent(roomId, msg.sender, content, block.timestamp);
    }

    function getRoom(uint256 roomId) public view returns (string memory name) {
        require(roomId < rooms.length, "Room does not exist");
        Room storage room = rooms[roomId];
        return room.name;
    }

    function getRoomMembers(uint256 roomId) public view returns (address[] memory members) {
        require(roomId < rooms.length, "Room does not exist");
        Room storage room = rooms[roomId];
        return room.members;
    }

    function getRoomMessagesCount(uint256 roomId) public view returns (uint256 count) {
        require(roomId < rooms.length, "Room does not exist");
        Room storage room = rooms[roomId];
        return room.messages.length;
    }

    function getRoomMessage(uint256 roomId, uint256 messageId) public view returns (address sender, string memory content, uint256 timestamp) {
        require(roomId < rooms.length, "Room does not exist");
        Room storage room = rooms[roomId];
        require(messageId < room.messages.length, "Message does not exist");
        Message storage message = room.messages[messageId];
        return (message.sender, message.content, message.timestamp);
    }

    function getUserRooms(address user) public view returns (uint256[] memory) {
        return userRooms[user];
    }

    function isMember(uint256 roomId, address user) public view returns (bool) {
        require(roomId < rooms.length, "Room does not exist");
        Room storage room = rooms[roomId];
        for (uint256 i = 0; i < room.members.length; i++) {
            if (room.members[i] == user) {
                return true;
            }
        }
        return false;
    }

    function getRoomCount() public view returns (uint256) {
        return rooms.length;
    }
}