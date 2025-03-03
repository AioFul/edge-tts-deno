// edge-tts-deno/examples/voice_list.ts
import { getVoices, classifyVoices, formatVoiceInfo } from "../mod.ts";

async function main() {
  const voices = await getVoices();
  console.log("All Voices:");
  console.log(JSON.stringify(voices, null, 2));

  const classifiedByGender = classifyVoices(voices, "Gender");
  console.log("\nVoices Classified by Gender:");
  console.log(JSON.stringify(classifiedByGender, null, 2));

  const firstVoice = voices[0];
    if(firstVoice){
        console.log("\nFormatted Info for the First Voice:");
        console.log(formatVoiceInfo(firstVoice));
    }

}

main().catch((error) => {
  console.error("Error:", error);
});