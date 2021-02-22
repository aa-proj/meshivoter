import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";
import { Photo } from "./Photo";

@Entity("Vote")
export class Vote {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @ManyToOne(() => User)
  user?: User;

  @ManyToOne(() => Photo)
  photo?: Photo;

  @Column()
  vote: "normal" | "up";
}
