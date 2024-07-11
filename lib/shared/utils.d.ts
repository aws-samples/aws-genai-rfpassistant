import { SystemConfig } from "./types";
export declare abstract class Utils {
    static copyDirRecursive(sourceDir: string, targetDir: string): void;
    static getDefaultEmbeddingsModel(config: SystemConfig): string;
    static getDefaultCrossEncoderModel(config: SystemConfig): string;
    static getName(config: SystemConfig, value: string, maxLength?: number): string;
}
