import { v4 } from "https://deno.land/std@0.100.0/uuid/mod.ts";
//import { readLines, readAll } from "https://deno.land/std@0.99.0/io/mod.ts";

/* to split command string into array of string */
function splitCommand(command: string): string[] {
  var myRegexp = /[^\s"]+|"([^"]*)"/gi;
  var splits = [];
  let match

  do {
    //Each call to exec returns the next regex match as an array
    match = myRegexp.exec(command);
    if (match != null) {
      //Index 1 in the array is the captured group if it exists
      //Index 0 is the matched text, which we use if no captured group exists
      splits.push(match[1] ? match[1] : match[0]);
    }
  } while (match != null);

  return splits;
}

export enum OutputMode {
  None = 0, // no output, just run the command
  StdOut, // dump the output to stdout
  Capture, // capture the output and return it
  Tee, // both dump and capture the output
}

export interface IExecStatus {
  code: number;
  success: boolean;
}

export interface IExecResponse {
  status: IExecStatus;
  output: string|string[]|Uint8Array|undefined;
}

interface IOptions {
  input?: Uint8Array;
  output?: OutputMode;
  verbose?: boolean;
  continueOnError?: boolean;
}

export const exec = async (
  command: string,
  options: IOptions = { output: OutputMode.StdOut, verbose: false },
): Promise<IExecResponse> => {
  const splits = splitCommand(command);

  let uuid = "";
  if (options.verbose) {
    uuid = v4.generate();
    console.log(``);
    console.log(`Exec Context: ${uuid}`);
    console.log(`    Exec Options: `, options);
    console.log(`    Exec Command: ${command}`);
    console.log(`    Exec Command Splits:  [${splits}]`);
  }

  const stdinpipe = command.includes('stdin')?'piped':'null'
  const stdoutpipe = command.includes('stdout')?'piped':'null'
  console.log('stdin: ' + stdinpipe)
  console.log('stdout: ' + stdoutpipe)

  const p = Deno.run({ cmd: splits, stdin: stdinpipe, stdout: stdoutpipe, stderr: "piped" });

  //const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  console.log(options.input)

  if (p && splits[1]==='stdin') {
    console.log('before stdin.write line: 69')
    await p.stdin?.write(
      typeof options.input === "object" ? options.input : encoder.encode(options.input)
    );
    //console.log(JSON.stringify(p.stdin))
    await p.stdin?.close();
  }
  // _deno-lint-ignore no-debugger
  // debugger;

  let _stderr:Uint8Array=new Uint8Array()
  //let _stdout:Uint8Array=new Uint8Array()
  const _status:IExecStatus={
    code:1,
    success:false
  }
  const result :IExecResponse = {
    status : _status,
    output : []
  }

  // let lines = []

  if (p) {
    
    /* for await (let line of readLines(p.stdout)) {
      lines.push(line);
    }
    console.log('lines: ' + JSON.stringify(lines)) */
    /* const buff = new Uint8Array(6500);
    await p.stdout.read(buff);
    console.log('report:' + new TextDecoder().decode(buff)); */
    //https://github.com/denoland/deno/issues/4568
    const [ stderr, stdout, status ] = await Promise.all([ p.stderrOutput(), p.output(), p.status() ]);
    //deno-lint-ignore no-debugger
    debugger;
    console.log(`stderr, stdout and status is done`);
    
    p.close();
    console.log(`p is closed`);
    
    result.status = status
    result.output = new TextDecoder().decode(stdout)
    // console.log('result: ' + result.output)
    _stderr = stderr
    // console.log('error:' +_stderr)
    /* _stdout = stdout
    _status = status */
    
  }

  //console.log('exec line 105:' + JSON.stringify(_stdout))

  /* const result = {
    status: {
      code:  _status.code,
      success: _status.success,
    },
    output: new TextDecoder().decode(_stdout),
  }; */
  if (options.verbose) {
    console.log("    Exec Result: ", result);
    console.log(`Exec Context: ${uuid}`);
    console.log(``);
  }

  return result;
  
};

export const execSequence = async (
  commands: string[],
  options: IOptions = {
    /* output: OutputMode.StdOut, */
    continueOnError: false,
    verbose: false,
  },
): Promise<IExecResponse[]> => {
  const results: IExecResponse[] = [];

  for (let i = 0; i < commands.length; i++) {
    const result = await exec(commands[i], options);
    results.push(result);
    if (options.continueOnError == false && result.status.code != 0) {
      break;
    }
  }

  return results;
};
