import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployDecentralizedChat: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployment = await deploy("DecentralizedChat", {
    from: deployer,
    log: true,
    autoMine: true,
  });

  const decentralizedChat = await hre.ethers.getContractAt("DecentralizedChat", deployment.address);

  // Example interaction: creating a room
  const tx = await decentralizedChat.createRoom("General");
  await tx.wait();

  const rooms = await decentralizedChat.getRoom(0);
  console.log("👋 Created room:", rooms);
};

export default deployDecentralizedChat;

deployDecentralizedChat.tags = ["DecentralizedChat"];
