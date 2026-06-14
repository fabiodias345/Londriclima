import { Global, Module } from "@nestjs/common";
import { GoogleDriveStorageService } from "./google-drive-storage.service";

@Global()
@Module({
  providers: [GoogleDriveStorageService],
  exports: [GoogleDriveStorageService]
})
export class StorageModule {}
