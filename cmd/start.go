package cmd

import (
	"fmt"

	"fg-cli/core"

	"github.com/spf13/cobra"
)

var coreType string

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start new connection",
	Run: func(cmd *cobra.Command, args []string) {
		switch coreType {
		case "warp":
			core.StartWarp()
		case "vibe":
			core.StartVibe()
		default:
			fmt.Println("❌ Invalid core: warp, vibe")
		}
	},
}

func init() {
	startCmd.Flags().StringVarP(&coreType, "core", "c", "", "core (warp or vibe)")
	startCmd.MarkFlagRequired("core")
	rootCmd.AddCommand(startCmd)
}
