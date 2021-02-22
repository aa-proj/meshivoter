import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Vote } from "./Vote";
import { Photo } from "./Photo";

@Entity("User")
export class User {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column()
  userId: string;

  @OneToMany(() => Vote, (vote) => vote.user)
  votes?: Vote[];

  @OneToMany(() => Photo, (photo) => photo.user)
  photos?: Photo[];
}
