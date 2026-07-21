import { Module } from "@nestjs/common";
import { BoltRules } from "./bolt.rules";

@Module({ providers: [BoltRules], exports: [BoltRules] })
export class BoltModule {}
