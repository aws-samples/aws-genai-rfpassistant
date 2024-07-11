#!/usr/bin/env node
"use strict";
// You might want to add this to the previous line --experimental-specifier-resolution=node
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const version_js_1 = require("./version.js");
(async () => {
    let program = new commander_1.Command();
    program
        .version(version_js_1.LIB_VERSION)
        .command("config", "📦 manage the chatbot configuration")
        .command("show", "🚚 display the current chatbot configuration")
        .command("deploy", "🌟 deploys the chatbot to your account")
        .description("🛠️  Easily create a chatbot");
    program.parse(process.argv);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFnaWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtYWdpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLDJGQUEyRjs7QUFFM0YseUNBQW9DO0FBQ3BDLDZDQUEyQztBQUUzQyxDQUFDLEtBQUssSUFBSSxFQUFFO0lBQ1YsSUFBSSxPQUFPLEdBQUcsSUFBSSxtQkFBTyxFQUFFLENBQUM7SUFDNUIsT0FBTztTQUNKLE9BQU8sQ0FBQyx3QkFBVyxDQUFDO1NBQ3BCLE9BQU8sQ0FBQyxRQUFRLEVBQUUscUNBQXFDLENBQUM7U0FDeEQsT0FBTyxDQUFDLE1BQU0sRUFBRSw4Q0FBOEMsQ0FBQztTQUMvRCxPQUFPLENBQUMsUUFBUSxFQUFFLHdDQUF3QyxDQUFDO1NBQzNELFdBQVcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0lBRS9DLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vLyBZb3UgbWlnaHQgd2FudCB0byBhZGQgdGhpcyB0byB0aGUgcHJldmlvdXMgbGluZSAtLWV4cGVyaW1lbnRhbC1zcGVjaWZpZXItcmVzb2x1dGlvbj1ub2RlXG5cbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tIFwiY29tbWFuZGVyXCI7XG5pbXBvcnQgeyBMSUJfVkVSU0lPTiB9IGZyb20gXCIuL3ZlcnNpb24uanNcIjtcblxuKGFzeW5jICgpID0+IHtcbiAgbGV0IHByb2dyYW0gPSBuZXcgQ29tbWFuZCgpO1xuICBwcm9ncmFtXG4gICAgLnZlcnNpb24oTElCX1ZFUlNJT04pXG4gICAgLmNvbW1hbmQoXCJjb25maWdcIiwgXCLwn5OmIG1hbmFnZSB0aGUgY2hhdGJvdCBjb25maWd1cmF0aW9uXCIpXG4gICAgLmNvbW1hbmQoXCJzaG93XCIsIFwi8J+amiBkaXNwbGF5IHRoZSBjdXJyZW50IGNoYXRib3QgY29uZmlndXJhdGlvblwiKVxuICAgIC5jb21tYW5kKFwiZGVwbG95XCIsIFwi8J+MnyBkZXBsb3lzIHRoZSBjaGF0Ym90IHRvIHlvdXIgYWNjb3VudFwiKVxuICAgIC5kZXNjcmlwdGlvbihcIvCfm6DvuI8gIEVhc2lseSBjcmVhdGUgYSBjaGF0Ym90XCIpO1xuXG4gIHByb2dyYW0ucGFyc2UocHJvY2Vzcy5hcmd2KTtcbn0pKCk7XG4iXX0=