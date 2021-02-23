import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Vote } from "./Vote";
import { User } from "./User";

@Entity("Photo")
export class Photo {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column()
  photoId: string;

  @Column({ default: null })
  uploadTime: number;

  @OneToMany(() => Vote, (vote) => vote.photo)
  votes?: Vote[];

  @ManyToOne(() => User)
  user?: User;
}
