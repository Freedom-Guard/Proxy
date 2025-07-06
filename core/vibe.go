package core

import (
	"fmt"
	"os/exec"
)

func StartVibe() {
	fmt.Println("🔒 Starting vibe-core...")
	cmd := exec.Command("./vibe/vibe-core", "run", "-c", "/etc/fg-cli/hiddify.json")
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Println("خطا در sing-box:", err)
	}
	fmt.Println(string(output))
}
