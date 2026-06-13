param(
    [Parameter(Mandatory=$true)]
    [string]$payloadB64
)
$payload = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($payloadB64))

$code = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredWriter {
    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int CredWriteW(ref CREDENTIAL credential, uint flags);

    [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", SetLastError = true)]
    private static extern int CredDeleteW(string target_name, uint type, uint flags);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public uint flags;
        public uint type;
        public string targetName;
        public string comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME lastWritten;
        public uint credentialBlobSize;
        public IntPtr credentialBlob;
        public uint persist;
        public uint attributeCount;
        public IntPtr attributes;
        public string targetAlias;
        public string userName;
    }

    public static bool WriteCredential(string target, string user, string secret) {
        // Delete existing credential first
        CredDeleteW(target, 1, 0);

        byte[] secretBytes = Encoding.UTF8.GetBytes(secret);
        IntPtr blobPtr = Marshal.AllocHGlobal(secretBytes.Length);
        try {
            Marshal.Copy(secretBytes, 0, blobPtr, secretBytes.Length);

            CREDENTIAL cred = new CREDENTIAL();
            cred.flags = 0;
            cred.type = 1; // CRED_TYPE_GENERIC
            cred.targetName = target;
            cred.comment = null;
            cred.credentialBlobSize = (uint)secretBytes.Length;
            cred.credentialBlob = blobPtr;
            cred.persist = 2; // CRED_PERSIST_LOCAL_MACHINE
            cred.attributeCount = 0;
            cred.attributes = IntPtr.Zero;
            cred.targetAlias = null;
            cred.userName = user;

            int res = CredWriteW(ref cred, 0);
            return res != 0;
        } finally {
            Marshal.FreeHGlobal(blobPtr);
        }
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]"CredWriter").Type) {
    Add-Type -TypeDefinition $code
}

$success = [CredWriter]::WriteCredential("gemini:antigravity", "antigravity", $payload)
if ($success) {
    Write-Output "success"
} else {
    Write-Output "failed"
}
