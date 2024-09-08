"use client";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from "next/image";
import type { NextPage } from "next";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi'; // Assuming you are using wagmi to manage the wallet state

const Home: NextPage = () => {
  const router = useRouter();
  const { address } = useAccount(); // Get wallet address (null if not connected)

  useEffect(() => {
    if (address) {
      // If wallet is connected, redirect to /chatrooms
      router.push('/chatrooms');
    }
  }, [address, router]);


  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-[90%] md:w-[75%]">
        <h1 className="text-center mb-6">
          <span className="block text-4xl font-bold">Simple Chat</span>
        </h1>
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/hero.png"
            width="760"
            height="231"
            alt="challenge banner"
            className="rounded-xl border-4 border-primary"
          />
          <div className="max-w-3xl bg-base-100 rounded-xl my-1.5">
          <h1 className='text-center mt-8'><span className="block text-2xl mb-2">Simple Chat</span></h1>
            <p className="text-lg">
            Simple Chat is an innovative chat room application, designed to serve as a starting point for anyone who
            who is interested in buidling an onchain chat application. 
            The experience starts when a user connects their wallets, where they are presented with  
            existing chat rooms, providing an immediate overview of thediscussion topics and 
            members of each chat room.
              </p>
            <p className="text-lg">
            In this implementation, the user has 2 options,  joining an 
            existing chat room or creating a new one. By joining  an existing chat room, users can instantly 
            become part of the conversation once they sign in their wallet. For those with unique interests or topics not yet covered, 
            the user can create new chat rooms. In a variation, more akin to Slack, only an admin can create a new room.
            </p>
            <p className="text-lg">
            Inside each chat room,  the other participants is visible, and anyone building on this can add features such as direct 
            messaging between members of the community etc
            To leave a chat room, the user clicks on the leave chat buttom and is prompted to authorize the transaction in the wallet
             <div className="flex justify-center items-center"> Connect your wallet to get started &nbsp; <ConnectButton showBalance={false} chainStatus="none" /></div>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
