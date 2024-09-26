import {
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  LAMPORTS_PER_SOL,
  Connection,
  Keypair,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { struct, u64, bool, GetStructureSchema } from "@raydium-io/raydium-sdk"
import base58 from "bs58";

export type BONDINGCURVECUSTOMLAYOUT = typeof BONDING_CURV
export type BONDINGCURVECUSTOM = GetStructureSchema<BONDINGCURVECUSTOMLAYOUT>

export const BONDING_CURV = struct([
  u64('virtualTokenReservs'),
  u64('virtualSolReserves'),
  u64('realTokenReserves'),
  u64('realSolReserves'),
  u64('tokenTotalSupply'),
  bool('complete'),
])
export const GLOBAL = new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
export const FEE_RECIPIENT = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");
export const SYSTEM_PROGRAM = new PublicKey("11111111111111111111111111111111");
export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOC_TOKEN_ACC_PROG = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const RENT = new PublicKey("SysvarRent111111111111111111111111111111111");
export const PUMP_FUN_ACCOUNT = new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1");
export const PUMP_FUN_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

const buyer = Keypair.fromSecretKey(base58.decode("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3b9RbUFHd3534SkQkkSDiFX41hxsCDKsa9trMGdkxBk6TNR8"))
const connection = new Connection("https://ssssssssssssssssssssss-onotsf-ssssssssssssssssssssssssss-mainnet.helius-rpc.com/")

export function bufferFromUInt64(value: number | string) {
  let buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

export const buySell = async (
  mint: PublicKey,
  solIn: number,
  slippageDecimal: number = 0.1
) => {

  console.log("Payer wallet public key is", buyer.publicKey.toBase58())
  const buyerPk = buyer.publicKey;
  const tokenMint = mint
  let buyerAta = await getAssociatedTokenAddress(tokenMint, buyerPk)
  console.log("🚀 ~ buyerAta:", buyerAta.toBase58())

  try {
    let ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500_000 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 })
    ];

    // Attempt to retrieve token account, otherwise create associated token account
    try {
      const buyerTokenAccountInfo = await connection.getAccountInfo(buyerAta, "processed")
      if (!buyerTokenAccountInfo) {
        ixs.push(
          createAssociatedTokenAccountInstruction(
            buyerPk,
            buyerAta,
            buyerPk,
            tokenMint,
          )
        )
      }
    } catch (error) {
      console.log(error)
      return
    }

    const TRADE_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
    const BONDING_ADDR_SEED = new Uint8Array([98, 111, 110, 100, 105, 110, 103, 45, 99, 117, 114, 118, 101]);

    // get the address of bonding curve and associated bonding curve
    const [bonding] = PublicKey.findProgramAddressSync([BONDING_ADDR_SEED, tokenMint.toBuffer()], TRADE_PROGRAM_ID);
    const [assoc_bonding_addr] = PublicKey.findProgramAddressSync([bonding.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID);

    // get the accountinfo of bonding curve
    const accountInfo = await connection.getAccountInfo(bonding, "processed")

    if (!accountInfo) return

    // get the poolstate of the bonding curve
    const poolState = BONDING_CURV.decode(
      accountInfo.data
    )

    console.log("virtualTokenReserves: ", poolState.virtualTokenReservs.toString());
    console.log("realTokenReserves: ", poolState.realTokenReserves.toString());

    // Calculate tokens out
    const virtualSolReserves = poolState.virtualSolReserves;
    const virtualTokenReserves = poolState.virtualTokenReservs;

    const solInLamports = solIn * LAMPORTS_PER_SOL;
    console.log("🚀 ~ solInLamports:", solInLamports)
    const tokenOut = Math.round(solInLamports * (virtualTokenReserves.div(virtualSolReserves)).toNumber());
    console.log("🚀 ~ tokenOut:", tokenOut)

    const ATA_USER = buyerAta;
    const USER = buyerPk;
    console.log("🚀 ~ buyerAta:", buyerAta)
    console.log("🚀 ~ buyerPk:", buyerPk)

    // Build account key list
    const buyKeys = [
      { pubkey: GLOBAL, isSigner: false, isWritable: false },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: bonding, isSigner: false, isWritable: true },
      { pubkey: assoc_bonding_addr, isSigner: false, isWritable: true },
      { pubkey: ATA_USER, isSigner: false, isWritable: true },
      { pubkey: USER, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: RENT, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false }
    ];

    // Calculating the slippage process
    const calc_slippage_up = (sol_amount: number, slippage: number): number => {
      const lamports = sol_amount * LAMPORTS_PER_SOL;
      // return Math.round(lamports * (1 + slippage));
      return Math.round(lamports / 1000 * (1 + slippage) + lamports / 1000 * (1 + slippage));
    }

    const instruction_buf = Buffer.from('66063d1201daebea', 'hex');
    const token_amount_buf = Buffer.alloc(8);
    token_amount_buf.writeBigUInt64LE(BigInt(tokenOut), 0);
    const slippage_buf = Buffer.alloc(8);
    slippage_buf.writeBigUInt64LE(BigInt(calc_slippage_up(solInLamports, slippageDecimal)), 0);
    const buyData = Buffer.concat([instruction_buf, token_amount_buf, slippage_buf]);

    const buyInstruction = new TransactionInstruction({
      keys: buyKeys,
      programId: PUMP_FUN_PROGRAM,
      data: buyData
    })

    ixs.push(buyInstruction)

    const sellKeys = [
      { pubkey: GLOBAL, isSigner: false, isWritable: false },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bonding, isSigner: false, isWritable: true },
      { pubkey: assoc_bonding_addr, isSigner: false, isWritable: true },
      { pubkey: ATA_USER, isSigner: false, isWritable: true },
      { pubkey: USER, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: ASSOC_TOKEN_ACC_PROG, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false }
    ];

    const data = Buffer.concat([
      bufferFromUInt64("12502976635542562355"),
      bufferFromUInt64(tokenOut),
      bufferFromUInt64(0)
    ]);

    const sellInstruction = new TransactionInstruction({
      keys: sellKeys,
      programId: PUMP_FUN_PROGRAM,
      data: data
    });

    ixs.push(sellInstruction)

    // instruction to close token account to reclaim sol
    const closeAccountInst = createCloseAccountInstruction(ATA_USER, buyerPk, buyerPk)
    ixs.push(closeAccountInst)

    const blockhash = await connection.getLatestBlockhash()

    const messageV0 = new TransactionMessage({
      payerKey: buyerPk,
      recentBlockhash: blockhash.blockhash,
      instructions: ixs,
    }).compileToV0Message()
    const transaction = new VersionedTransaction(messageV0)
    transaction.sign([buyer])

    console.log(await connection.simulateTransaction(transaction))

    const signature = await connection.sendRawTransaction(transaction.serialize()
      // , { skipPreflight: true }
    )

    const confirmation = await connection.confirmTransaction(
      {
        signature,
        lastValidBlockHeight: blockhash.lastValidBlockHeight,
        blockhash: blockhash.blockhash,
      },
      "confirmed",
    );

    if (confirmation.value.err) {
      console.log("Confrimtaion error")
      return
    } else {
      console.log(`https://solscan.io/tx/${signature}`)
    }

  } catch (e) {
    console.log(`Failed to buy token, ${mint}`)
  }
}

buySell(new PublicKey("DUTgVTbuUSzjhu6DNmjmDPR5pR4c3KX6BrjYayw63vy5"), 0.1)