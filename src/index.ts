import {
  APIMessage,
  BaseClient,
  Client,
  Emoji,
  Message,
  MessageEmbed,
  TextChannel,
  WSEventType,
} from "discord.js";
import { Connection, ConnectionOptions, createConnection } from "typeorm";
import { Photo } from "./entitiy/Photo";
import { User } from "./entitiy/User";
import { Vote } from "./entitiy/Vote";
import { Logger } from "./logger";

// Discordクライアント
const client = new Client();
const logger = new Logger();

// TypeORMのオプション
const options: ConnectionOptions = {
  type: "sqlite",
  database: "./db/db.sqlite3",
  entities: [Photo, User, Vote],
  synchronize: false,
};

// TypeORMのコネクション 使う前にnullチェックが必要
let connection: Connection | null = null;

async function connectDB() {
  connection = await createConnection(options);
  await connection.query("PRAGMA foreign_keys=OFF");
  await connection.synchronize();
  await connection.query("PRAGMA foreign_keys=ON");
  logger.info("DB connected", "DB");
}

// コネクションする
connectDB();

// リアクションされたときのインターフェース
interface IReaction {
  user_id: string; // Discord uid
  message_id: string; // Message id
  emoji: Emoji; // EmojiResolvable
  channel_id: string; // ChannelID
  guild_id: string; // GuildID
}

client.on("ready", () => {
  const cid = client.user?.id;
  // @ts-ignore
  client.api
    // @ts-ignore
    .applications(cid)
    .guilds("606109479003750440")
    .commands.post({
      data: {
        name: "meshi",
        description: "飯Voterの状態を表示します",
        options: [
          {
            name: "command",
            description: "UserNameをつけることができます",
            type: 3,
            required: false,
          },
        ],
      },
    });

  client.ws.on(<WSEventType>"INTERACTION_CREATE", async (interaction) => {
    const command = interaction.data.name.toLowerCase();
    const args = interaction.data.options;

    if (command === "meshi") {
      let cmdUserId;
      if (args) {
        cmdUserId = args.find((arg: any) => arg.name.toLowerCase() == "command")
          .value;
      }
      if (!cmdUserId) cmdUserId = interaction.member.user.id;
      console.log(cmdUserId);
      const regex = /\d+/;
      const found = cmdUserId.match(regex)[0];

      const sendUser = await getUser(found);
      const sendUserName = getNameFromID(found);

      let g = await client.guilds.cache.get("606109479003750440");
      const id = g?.member(found)?.id;
      const avatar = g?.member(found)?.user.avatar;

      // console.log(sendUserName);
      const embed = new MessageEmbed()
        .setAuthor(
          sendUserName,
          "https://cdn.discordapp.com/avatars/" + id + "/" + avatar + ".png"
        )
        .setDescription(
          [
            "投票数: " + (sendUser?.votes?.length || "0"),
            "写真数: " + (sendUser?.photos?.length || "0"),
            "スコア: " + (await getScore(sendUser?.photos)),
          ].join("\n")
        );
      // @ts-ignore
      client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
          type: 4,
          data: await createAPIMessage(interaction, embed),
        },
      });
    }
  });
});

async function createAPIMessage(interaction: any, content: any) {
  const apiMessage = await APIMessage.create(
    // @ts-ignore
    client.channels.resolve(interaction.channel_id),
    content
  )
    .resolveData()
    .resolveFiles();

  return { ...apiMessage.data, files: apiMessage.files };
}

// メッセージが来たとき
client.on("message", async (msg) => {
  if (msg.author.bot) return;
  if (msg.channel.id == "812367810415296572") {
    if (!!msg.attachments.size) {
      const sendUser = await getUser(msg.author.id);
      await addPhoto(<User>sendUser, msg.id);
      msg.react("➖").then(() => {
        msg.react("👍");
      });
    }
  }
});

async function getScore(photos: Photo[] | undefined) {
  if (!photos) return 0;
  let score = 0;
  for (const p of photos) {
    const voteRepository = connection?.getRepository(Vote);
    const votes = await voteRepository?.find({ photo: p });
    // console.log(votes);
    votes?.forEach((v) => {
      if (v.vote == "up") {
        score++;
      }
    });
  }
  return score;
}

async function getUser(userId: string): Promise<User | undefined> {
  const userRepository = connection?.getRepository(User);
  const findResult = await userRepository?.findOne(
    { userId },
    { relations: ["photos", "votes"] }
  );
  if (!findResult) {
    // console.log("not found");
    const newUser = userRepository?.create({
      userId,
    });
    return await userRepository?.save(<User>newUser);
  }
  return findResult;
}

async function addPhoto(user: User, photoId: string) {
  const photoRepository = connection?.getRepository(Photo);
  const newPhoto = photoRepository?.create({
    user,
    photoId,
    uploadTime: new Date().getTime(),
  });
  await photoRepository?.save(<Photo>newPhoto);
}

async function getPhoto(photoId: string) {
  const photoRepository = connection?.getRepository(Photo);
  return await photoRepository?.findOne({ photoId });
}

async function addVote(photo: Photo, user: User, vote: string) {
  const voteRepository = connection?.getRepository(Vote);
  if (vote == "➖" || vote == "👍") {
    const newVote = voteRepository?.create({
      user,
      photo,
      vote: vote == "➖" ? "normal" : "up",
      voteTime: new Date().getTime(),
    });
    await voteRepository?.save(<Vote>newVote);
  }
}

// メッセージにリアクションがあったとき
async function msgReactionAdd(reaction: IReaction) {
  let g = client.guilds.cache.get(
    reaction.guild_id
  ); /*
  const general = <TextChannel>g?.channels.cache.get(generalChannel); // TODO
*/
  if (g?.member(reaction.user_id)?.user.bot) return;
  const sendUser = await getUser(reaction.user_id);
  // console.log(sendUser?.userId + ":" + reaction.emoji.name);
  const photo = await getPhoto(reaction.message_id);
  if (photo) {
    await addVote(<Photo>photo, <User>sendUser, reaction.emoji.name);
  }
}

// discord uid からニックネームをとってくるメソッド
function getNameFromID(id: string) {
  let g = client.guilds.cache.get("606109479003750440");
  let nickName = g?.member(id)?.nickname?.replace("@", "＠");
  if (!nickName) nickName = g?.member(id)?.displayName;
  return nickName;
}

// リアクションが消されたとき
function msgReactionRemove(reaction: IReaction) {
  // return reaction;
}

// initMeg()
function initMsg() {
  //todo
}

// ミリ秒を x時間x分x秒にするやつ いらない単位は消える
function getTimeFromMills(m: number) {
  let byo: number = Math.floor(m / 1000) % 60;
  let hun: number = Math.floor(m / 60000) % 60;
  let ji: number = Math.floor(m / 3600000);
  let result = "";
  if (ji != 0) result += ji + "時間 ";
  if (hun != 0) result += hun + "分 ";
  if (byo != 0) result += byo + "秒";
  return result;
}

// rawイベントを取得 リアクションのイベントを発火させてる
client.on("raw", (reaction) => {
  switch (reaction.t) {
    case "MESSAGE_REACTION_ADD":
      msgReactionAdd(reaction.d);
      break;
    case "MESSAGE_REACTION_REMOVE":
      msgReactionRemove(reaction.d);
      break;
  }
});

// tokenを環境変数から読み込み
const token = process.env.D_TOKEN;
// botにログイン
client.login(token);
