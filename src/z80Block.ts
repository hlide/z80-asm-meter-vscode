import { workspace } from 'vscode';
import { Z80Instruction } from "./z80Instruction";
import { Z80InstructionSet } from './z80InstructionSet';
import { formatTiming, extractInstructionFrom } from './z80Utils';

export class Z80Block {

    // Timing information
    public z80Timing: number[] = [0, 0];
    public z80M1Timing: number[] = [0, 0];
    public cpcTiming: number[] = [0, 0];

    // Size information
    public size: number = 0;
    public loc: number = 0;

    // Opcodes information
    public opcodes: string = "";

    // Display configuration
    private timingConfiguration: string | undefined = undefined;
    private sizeConfiguration: string | undefined = undefined;
    private opcodesConfiguration: string | undefined = undefined;

    constructor(sourceCode: string | undefined) {

        if (!sourceCode) {
            return;
        }
        const lines = sourceCode.split(/[\r\n]+/);
        if (lines.length === 0) {
            return;
        }
        if (lines[lines.length - 1].trim() === "") {
            lines.pop(); // (removes possible spurious empty line at the end of the selection)
        }

        const configuration = workspace.getConfiguration("z80-asm-meter");

        // (disables if maximum lines exceeded)
        const maxLines: number | undefined = configuration.get("maxLines");
        if ((!!maxLines) && (lines.length > maxLines)) {
            return;
        }

        // For every line...
        const maxLoc: number | undefined = configuration.get("maxLoC");
        lines.forEach(rawLine => {
            // Extracts the instruction
            const rawInstruction = extractInstructionFrom(rawLine);
            const instruction = Z80InstructionSet.instance.parseInstruction(rawInstruction);
            this.addInstruction(instruction);

            // (stops after maximum loc count)
            if ((!!maxLoc) && (this.loc >= maxLoc)) {
                return;
            }
        });

        // Saves display configuration
        this.timingConfiguration = configuration.get("timing", "disabled");
        this.sizeConfiguration = configuration.get("size", "disabled");
        this.opcodesConfiguration = configuration.get("opcodes", "disabled");
    }

    public addInstruction(instruction: Z80Instruction | undefined) {

        if (!instruction) {
            return;
        }

        const instructionZ80Timing = instruction.getZ80Timing();
        this.z80Timing[0] += instructionZ80Timing[0];
        this.z80Timing[1] += instructionZ80Timing[1];

        const instructionZ80M1Timing = instruction.getZ80M1Timing();
        this.z80M1Timing[0] += instructionZ80M1Timing[0];
        this.z80M1Timing[1] += instructionZ80M1Timing[1];

        const instructionCPCTiming = instruction.getCPCTiming();
        this.cpcTiming[0] += instructionCPCTiming[0];
        this.cpcTiming[1] += instructionCPCTiming[1];

        this.size += instruction.getSize();
        this.loc++;

        this.opcodes += instruction.getOpcode() + `\n`;
    }

    public getTimingInformation(): Record<string, string | undefined> | undefined {

        // (empty or disabled)
        if ((this.loc === 0) || (this.timingConfiguration === "disabled")) {
            return undefined;
        }

        const z80text = formatTiming(this.z80Timing);
        const z80M1Text = formatTiming(this.z80M1Timing);
        const cpcText = formatTiming(this.cpcTiming);
        return {
            "text":
                this.timingConfiguration === "z80" ? z80text
                : this.timingConfiguration === "msx" ? z80M1Text
                : this.timingConfiguration === 'cpc' ? cpcText
                : this.timingConfiguration === "z80+msx" ? `${z80text} (${z80M1Text})`
                : this.timingConfiguration === "z80+cpc" ? `${z80text} (${cpcText})`
                : undefined,
            "tooltip":
                `Z80: ${z80text} clock cycles\n`
                + `Z80+M1 (MSX): ${z80M1Text} clock cycles\n`
                + `Amstrad CPC: ${cpcText} NOPs`
        };
    }

    public getSizeInformation(): Record<string, string | undefined> | undefined {

        // (empty or disabled)
        if ((this.loc === 0) || (this.sizeConfiguration === "disabled")) {
            return undefined;
        }

        const sizeText = this.size + (this.size === 1 ? " byte" : " bytes");
        const locText = this.loc + " LoC";
        return {
            "text":
                this.sizeConfiguration === "bytecode" ? sizeText
                : this.sizeConfiguration === "loc" ? locText
                : this.sizeConfiguration === "bytecode+loc" ? `${sizeText} (${locText})`
                : undefined,
            "tooltip":
                sizeText + " in " + this.loc + " selected " + (this.loc === 1 ? "line" : "lines") + " of code (LoC)",
        };
    }

    public getOpcodesInformation(): Record<string, string | undefined> | undefined {

        // (empty or disabled)
        if ((this.loc === 0) || (this.opcodesConfiguration === "disabled")) {
            return undefined;
        }

        const opcodesText = this.opcodes;
        return {
            "text":
                this.opcodesConfiguration === "enabled" ? opcodesText
                : undefined,
            "tooltip":
                opcodesText,
        };
    }

    public getLoc(): number {
        return this.loc;
    }
}
