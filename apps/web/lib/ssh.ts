// ═══════════════════════════════════════════════════════
// Agency-OS — SSH Remote Execution
// ═══════════════════════════════════════════════════════
// Executes commands on remote servers via SSH using
// encrypted private keys stored in the database.

import { Client } from "ssh2"
import { decrypt } from "./encryption"
import { db } from "@repo/db"

interface SSHExecResult {
  stdout: string
  stderr: string
  code: number
}

/**
 * Execute a command on a remote server via SSH.
 */
export async function sshExec(
  instanceId: string,
  command: string,
  options: { timeout?: number } = {}
): Promise<SSHExecResult> {
  const instance = await db.tenantInstance.findUnique({
    where: { id: instanceId },
    select: {
      serverHost: true,
      serverPort: true,
      sshUser: true,
      sshPrivateKey: true,
    },
  })

  if (!instance) throw new Error(`Instance ${instanceId} not found`)
  if (!instance.serverHost) throw new Error("No server host configured")
  if (!instance.sshPrivateKey) throw new Error("No SSH key configured")

  const privateKey = decrypt(instance.sshPrivateKey)

  return new Promise((resolve, reject) => {
    const conn = new Client()
    const timeout = options.timeout || 30000

    const timer = setTimeout(() => {
      conn.end()
      reject(new Error(`SSH command timed out after ${timeout}ms`))
    }, timeout)

    conn
      .on("ready", () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            clearTimeout(timer)
            conn.end()
            return reject(err)
          }

          let stdout = ""
          let stderr = ""

          stream
            .on("close", (code: number) => {
              clearTimeout(timer)
              conn.end()
              resolve({ stdout, stderr, code: code || 0 })
            })
            .on("data", (data: Buffer) => {
              stdout += data.toString()
            })
            .stderr.on("data", (data: Buffer) => {
              stderr += data.toString()
            })
        })
      })
      .on("error", (err) => {
        clearTimeout(timer)
        reject(new Error(`SSH connection failed: ${err.message}`))
      })
      .connect({
        host: instance.serverHost!,
        port: instance.serverPort || 22,
        username: instance.sshUser || "deploy",
        privateKey,
      })
  })
}

/**
 * Test SSH connectivity to a server.
 */
export async function testSSH(
  host: string,
  port: number,
  user: string,
  privateKeyEncrypted: string
): Promise<{ success: boolean; error?: string; info?: string }> {
  try {
    const privateKey = decrypt(privateKeyEncrypted)

    return new Promise((resolve) => {
      const conn = new Client()
      const timer = setTimeout(() => {
        conn.end()
        resolve({ success: false, error: "Connection timed out (10s)" })
      }, 10000)

      conn
        .on("ready", () => {
          conn.exec("echo OK && uname -a && docker --version 2>/dev/null || echo 'docker: not found'", (err, stream) => {
            if (err) {
              clearTimeout(timer)
              conn.end()
              return resolve({ success: false, error: err.message })
            }

            let output = ""
            stream
              .on("close", () => {
                clearTimeout(timer)
                conn.end()
                resolve({ success: true, info: output.trim() })
              })
              .on("data", (data: Buffer) => {
                output += data.toString()
              })
          })
        })
        .on("error", (err) => {
          clearTimeout(timer)
          resolve({ success: false, error: err.message })
        })
        .connect({ host, port, username: user, privateKey })
    })
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Upload a file to remote server via SFTP.
 */
export async function sshUpload(
  instanceId: string,
  localContent: string | Buffer,
  remotePath: string
): Promise<void> {
  const instance = await db.tenantInstance.findUnique({
    where: { id: instanceId },
    select: {
      serverHost: true,
      serverPort: true,
      sshUser: true,
      sshPrivateKey: true,
    },
  })

  if (!instance?.serverHost || !instance.sshPrivateKey) {
    throw new Error("Instance not configured for SSH")
  }

  const privateKey = decrypt(instance.sshPrivateKey)

  return new Promise((resolve, reject) => {
    const conn = new Client()
    const timer = setTimeout(() => {
      conn.end()
      reject(new Error("SFTP upload timed out"))
    }, 60000)

    conn
      .on("ready", () => {
        conn.sftp((err, sftp) => {
          if (err) {
            clearTimeout(timer)
            conn.end()
            return reject(err)
          }

          const writeStream = sftp.createWriteStream(remotePath)
          writeStream.on("close", () => {
            clearTimeout(timer)
            conn.end()
            resolve()
          })
          writeStream.on("error", (e: Error) => {
            clearTimeout(timer)
            conn.end()
            reject(e)
          })

          const content = typeof localContent === "string"
            ? Buffer.from(localContent)
            : localContent
          writeStream.end(content)
        })
      })
      .on("error", (err) => {
        clearTimeout(timer)
        reject(new Error(`SSH connection failed: ${err.message}`))
      })
      .connect({
        host: instance.serverHost!,
        port: instance.serverPort || 22,
        username: instance.sshUser || "deploy",
        privateKey,
      })
  })
}
